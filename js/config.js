/*
 * CleanFrame for VIDAA — your settings.
 * Edit this file, then upload the folder again. Everything here is plain text.
 */
var CLEANFRAME_CONFIG = {
  // Your name for the greeting ("Good evening, Sam"). Leave "" for no name.
  name: "",

  // Weather location. Find yours at https://www.latlong.net
  // Default: Toronto, Ontario.
  weather: {
    enabled: true,
    place: "Toronto",
    latitude: 43.6532,
    longitude: -79.3832,
    units: "celsius" // or "fahrenheit"
  },

  // Your shortcut tiles. Each opens a web page on the TV.
  // color is the tile's accent; letter is shown when there's no icon image.
  shortcuts: [
    { name: "YouTube", url: "https://www.youtube.com/tv", color: "#ff3b30", letter: "Y" },
    { name: "Weather", url: "https://www.theweathernetwork.com/ca", color: "#2f80ed", letter: "W" },
    { name: "CBC News", url: "https://www.cbc.ca/news", color: "#e03a3e", letter: "C" },
    { name: "Google", url: "https://www.google.ca", color: "#34a853", letter: "G" }
  ],

  // Your own photos. Put .jpg files in the "photos" folder and list them here,
  // e.g. "photos/cottage.jpg". Empty list = use the built-in colour scenes.
  // Note: anything you upload to a public site can be seen by anyone with the link.
  photos: [],

  // Minutes of no button presses before the screen fades to "frame mode"
  // (just the picture and a small clock). 0 turns it off.
  frameModeAfterMinutes: 5,

  // How often the picture changes, in minutes.
  photoEveryMinutes: 10
};
