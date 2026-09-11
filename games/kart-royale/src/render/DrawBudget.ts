/**
 * ============================================================================
 *  DrawBudget — keeps the frame inside the draw-call budget.
 * ============================================================================
 *  ART_DIRECTION section 8 allows 250 draw calls in a typical frame at
 *  Quality.High. Measured with `renderer.info.autoReset = false` and the info
 *  block reset by hand around the scene pass (see tools/perf.mjs — with
 *  autoReset on, the composer's final fullscreen quad is the last `render()`
 *  of the frame and the whole scene reads as one call, which is how this went
 *  unnoticed for so long), the field alone was spending 220 of them:
 *
 *      8 karts x 15 meshes x (1 colour draw + 1.33 cascade draws)
 *
 *  Nothing here removes content. The karts keep every mesh they had; what
 *  changes is *when* the fifteen are drawn:
 *
 *    - Every kart carries a merged single-material bake of itself, built at
 *      construction time (KartModel.mergeToImpostor). The bake is only a
 *      far-distance visual representation; a kart's local contact shadow is
 *      owned by its separate ground-hugging mesh.
 *    - Past `LOD_SWAP` metres the detail meshes are hidden and the bake is what
 *      the camera sees, so a distant kart is one draw instead of fifteen.
 *
 *  Measured over the nine capture vantage points at 1080p, this takes a typical
 *  frame from 259-386 draw calls to 167-216.
 *
 *  Runs in `lateUpdate` and must be registered AFTER ChaseCamera, because
 *  every decision it makes is measured from the camera the chase rig has just
 *  finished posing.
 * ============================================================================
 */
import * as THREE from 'three';
import { Quality, type Ctx, type System } from '../types';
import { syncKartEnv } from '../kart/Liveries';
import { registerPrewarm } from '../core/Prewarm';

/**
 * Distance at which a kart collapses to its merged bake, metres.
 *
 * The camera is 62 degrees vertical, so the visible frame is 1.2 x d metres
 * tall: a 1.1 m kart at 20 m is 3.3% of frame height, about 66 px at 1440p and
 * 36 px at 720p. What survives at that size is the silhouette and the livery,
 * and the bake keeps both exactly — same vertices, same colour attribute. What
 * it drops is the clearcoat's second specular lobe, the chrome's mirror and the
 * visor's Fresnel, none of which have enough pixels left to resolve.
 *
 * `LOD_KEEP` is the distance it comes back at. The gap is deliberate: karts
 * trade places constantly, and a single threshold has one of them flickering
 * between fifteen meshes and one every time it drifts across the line.
 */
const LOD_SWAP = 20;
const LOD_KEEP = 17;
/** Medium and below swap earlier — the same look at half the pixel count. */
const LOD_SWAP_LOW = 13;
const LOD_KEEP_LOW = 11;

interface KartLod {
  root: THREE.Object3D;
  impostor: THREE.Mesh;
  detail: THREE.Object3D[];
  /** true while the detail meshes are the ones being drawn */
  near: boolean;
}

/**
 * How hard the frame-time governor is allowed to pull the LOD and shadow
 * distances in, as a fraction of their authored values.
 *
 * A quality tier is chosen once, at boot, from a renderer string. It cannot
 * know that the phone is two laps into a race and thermally throttling, or that
 * the whole field has just arrived in the tunnel together. When the frame is
 * consistently over budget the cheapest thing to give up is the distance at
 * which rivals collapse to their merged bake — the kart at 18 m loses its
 * clearcoat lobe and nothing else, and it gets it back the moment there is
 * headroom. Down fast, back slowly, and never past this floor, so a struggling
 * device degrades instead of stuttering and a healthy one is untouched.
 */
const GOVERNOR_FLOOR = 0.55;

const _pos = new THREE.Vector3();

export class DrawBudget implements System {
  /** Debug switch: off restores the un-LODed field. See tools/perf.mjs. */
  enabled = true;
  private lods: KartLod[] = [];
  /**
   * Identity of the field the LOD list was built from. Not just the count: a
   * rebuilt grid of the same size has to re-bind or this holds handles into
   * models that are no longer in the scene.
   *
   * Held as two fields rather than as a joined string. It is compared on every
   * frame, and building `count + ':' + uuid` to compare it allocated a string
   * per frame for the whole race — the only allocation left in this file, and
   * ART_DIRECTION section 8 asks for none.
   */
  private boundCount = -1;
  private boundId = '';
  /** smoothed frame time, seconds; drives the governor. See GOVERNOR_FLOOR. */
  private smoothDt = 1 / 60;
  private governor = 1;

  /** 1 = the authored distances, GOVERNOR_FLOOR = as tight as it will ever go. */
  get lodGovernor() { return this.governor; }

  /**
   * Bind at boot rather than waiting for the first frame, for one reason: the
   * shader pre-warm runs immediately after every system's `init`, and the two
   * materials the impostor swaps between are reachable from `root.userData`
   * only — they hang off no mesh in the scene, so the pre-warm's scene walk
   * cannot see them.
   *
   * Today that is harmless: measured over a 45 s race the program cache holds
   * flat at 83 and the LOD swap compiles nothing, because the impostor's
   * program key collides with one the field already has. But that is an
   * accident of what the karts happen to be made of, not a property anybody
   * stated, and the failure mode if it ever stops being true is the worst one
   * in the game — a synchronous compile on the frame a rival crosses 20 m,
   * which is the "screen flashes black" mechanism Prewarm.ts documents.
   * Registering costs nothing when the pass finds the program already built,
   * and it also covers the re-warm after a WebGL context restore.
   */
  init(ctx: Ctx) {
    const karts = ctx.race?.karts;
    if (karts && karts.length) this.bind(karts, karts.length, karts[0].object.uuid);
  }

  lateUpdate(ctx: Ctx, dt = ctx.dt) {
    // The kart materials are keyed to the scene's environment intensity by a
    // render hook on `bodyPaint`, which stops firing the moment that mesh is
    // hidden. Drive it from here instead: it early-outs on an unchanged value,
    // so it is one float compare in the common case.
    syncKartEnv(ctx.scene.environmentIntensity);

    if (!this.enabled) return;
    const karts = ctx.race?.karts;
    if (!karts || !karts.length) return;
    const id = karts[0].object.uuid;
    if (this.boundCount !== karts.length || this.boundId !== id) {
      this.bind(karts, karts.length, id);
    }
    if (!this.lods.length) return;

    // --- frame-time governor ------------------------------------------------
    // `dt` arrives already clamped to 1/20 upstream, which is what we want: this
    // has to chase a sustained deficit, not a single stall.
    if (dt > 0) {
      this.smoothDt += (dt - this.smoothDt) * Math.min(1, dt * 2.5);
      const HOT = 1 / 55, COOL = 1 / 68;
      if (this.smoothDt > HOT) this.governor = Math.max(GOVERNOR_FLOOR, this.governor - dt * 0.8);
      else if (this.smoothDt < COOL) this.governor = Math.min(1, this.governor + dt * 0.06);
    }

    const q = ctx.settings.quality;
    const g = this.governor;
    const swap = (q >= Quality.High ? LOD_SWAP : LOD_SWAP_LOW) * g;
    const keep = (q >= Quality.High ? LOD_KEEP : LOD_KEEP_LOW) * g;
    const cam = ctx.camera;

    for (const lod of this.lods) {
      lod.root.getWorldPosition(_pos);
      const d = _pos.distanceTo(cam.position);

      // --- level of detail -------------------------------------------------
      const near = lod.near ? d < swap : d < keep;
      if (near !== lod.near) {
        lod.near = near;
        for (const n of lod.detail) n.visible = near;
      }
      lod.impostor.visible = !near;
    }
  }

  dispose() {
    this.lods = [];
    this.boundCount = -1;
    this.boundId = '';
  }

  // -------------------------------------------------------------------------

  /**
   * Finds the model root inside each kart's scene node. `Kart` wraps the built
   * model in two groups of its own (`object` -> `visual` -> model root), and
   * neither the wrapper nor `IKart` exposes the model, so the handles are
   * picked up off the userData the builder leaves behind rather than by
   * widening a shared interface for a renderer-side concern.
   */
  private bind(karts: { object: THREE.Object3D }[], count: number, id: string) {
    this.lods = [];
    this.boundCount = count;
    this.boundId = id;
    for (const k of karts) {
      k.object.traverse((o) => {
        const imp = o.userData?.impostor as THREE.Mesh | undefined | null;
        const detail = o.userData?.detailNodes as THREE.Object3D[] | undefined;
        if (!imp || !detail) return;
        // The far-detail material has to exist before this kart is allowed into
        // the list.
        // Assigning `undefined` to `Mesh.material` does not fail here — it
        // fails inside `WebGLRenderer.render`, part-way through the opaque
        // queue, and everything after it in that queue is simply never drawn.
        // A half-drawn frame is indistinguishable from the black partial
        // renders being reported, so a kart missing its far material keeps all
        // fifteen of its meshes rather than taking the whole frame down.
        const bakeMat = o.userData?.impostorMat as THREE.Material | undefined;
        if (!bakeMat) return;
        registerPrewarm(bakeMat, { label: 'kart-impostor-bake' });
        this.lods.push({
          root: o, impostor: imp, detail, near: true,
        });
      });
    }
  }
}
