import Config

# libcluster strategies per environment (design D6). Disabled until P10
# justifies multi-node; cookie must come from secret management in prod.
config :libcluster,
  topologies: [
    afterlight: [
      strategy: Cluster.Strategy.Gossip,
      config: [
        port: 45892,
        if_addr: "0.0.0.0",
        multicast_addr: "230.1.1.1",
        multicast_if: "0.0.0.0",
        multicast_ttl: 1,
        secret: System.get_env("RELEASE_COOKIE") || "afterlight_dev_cookie"
      ]
    ]
  ]
