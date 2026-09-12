defmodule Afterlight.Theater.Errors do
  @moduledoc """
  Stable theater error reason strings and readable text (byte-identical to
  `theaterErrorText` in shared/theaterModel.js).
  """

  @reasons ~w(
    invalid_url no_file_chosen url_too_long queue_full item_not_found
    nothing_playing item_mismatch invalid_position seek_unsupported
    invalid_action use_import is_mix playlist_not_public playlist_unreadable
    resolve_in_flight resolve_cooldown
  )

  def reasons, do: @reasons

  def text("invalid_url"),
    do: "That link is not something the projector can play. Try YouTube, Vimeo, Twitch, a direct video file, or an .m3u8 stream."

  def text("no_file_chosen"),
    do: "Pick a file from that torrent first \u2014 paste the magnet and choose from its file list."

  def text("url_too_long"), do: "That link is far too long to pin to the marquee."
  def text("queue_full"), do: "The queue reel is full. Remove something first."
  def text("item_not_found"), do: "That item is no longer on the bill."
  def text("nothing_playing"), do: "Nothing is on the screen right now."
  def text("item_mismatch"), do: "The screen has moved on to something else."
  def text("invalid_position"), do: "That timestamp does not make sense."
  def text("seek_unsupported"), do: "Live channels cannot be rewound."
  def text("invalid_action"), do: "The projector does not understand that request."

  def text("use_import"),
    do: "That link is a whole playlist \u2014 import it and its videos come to the reel together."

  def text("is_mix"),
    do:
      "Radio mixes never end, so the projector cannot pin them down \u2014 add the video itself instead."

  def text("playlist_not_public"),
    do:
      "That playlist is private or no longer exists \u2014 the projector can only read public playlists."

  def text("playlist_unreadable"),
    do: "The projector could not read that playlist just now. Give it a moment and try again."

  def text("resolve_in_flight"), do: "Hold on \u2014 one playlist is still being read."

  def text("resolve_cooldown"),
    do: "Give the projector a breath \u2014 try that playlist again in a moment."

  def text(_other), do: "The projector ignores that."
end
