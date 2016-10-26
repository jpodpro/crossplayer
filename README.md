# CrossPlayer

JavaScript API for playing SoundCloud, YouTube, DropBox audio files or direct web audio files.

## Location of files

- Compiled and minified JS files are in the [dist/](https://github.com/jpodpro/crossplayer/tree/master/dist) folder.
- Source JS files are in the [src/](https://github.com/jpodpro/crossplayer/tree/master/src) folder.

## Build

To compile CrossPlayer by yourself, make sure you have [Node.js](http://nodejs.org/) and [Grunt.js](https://github.com/cowboy/grunt), then:

1) Clone the repository

`git clone https://github.com/jpodpro/crossplayer.git`

2) Install Node dependencies

`cd crossplayer && npm install`

3) Run `grunt` to generate the JS files in the `dist` folder

`grunt`

Optionally:

- Run `grunt watch` to automatically rebuild JS files when you change files in `src/`.

## Usage

1) Include CrossPlayer javascript file

```html
<script src="crossplayer.min.js">
```

2) Create a DOM element for the player with unique ID:
  
```html
<div id="unique-id"></div>
```
  
3) Init CrossPlayer

```javascript
var player = new CrossPlayer({elementId:'unique-id'});
```
    
4) Play any SoundCloud, YouTube, DropBox or direct web file:

```javascript
player.playUrl("https://soundcloud.com/swingsetsounds/al-green-love-happiness-jpod-remix");
player.playUrl("https://www.youtube.com/watch?v=sJ5Of6z08Fs");
player.playUrl("https://www.dropbox.com/s/basht6kygq2a54u/JPOD%20-%20BlissCoast%206%20-%20Cape%20%26%20Kalimba.mp3?dl=0");
player.playUrl("http://jpodtbc.com/music/short.mp3");
```
    
## Options

- `elementId` the ID of the player DOM element
- `progressInterval` milliseconds between each progress update
- `enableSoundCloud` set false to disable SoundCloud player
- `enableYouTube` set false to disable YouTube player
- `enableDropBox` set false to disable DropBox player
- `enableWebLink` set false to disable direct link player
- `scClientId` SoundCloud client ID required to use the [HTTP API](https://developers.soundcloud.com/docs/api/sdks). When not provided player uses the [Widget API](https://developers.soundcloud.com/docs/api/html5-widget).

## Control

The following methods are available to control a CrossPlayer instance:

- `playUrl(url)`
- `play()`
- `pause()`
- `togglePlayPause()`
- `stop()`
- `seek(positionMS)`

## Callbacks

There are various callbacks you can register for updates about the player state. Some callbacks provide a single argument to the callback function. Callbacks are registered like so:

```javascript
player.onPlaying( function() {
	console.log('we are playing');
}
player.onProgress( function( data ) {
	console.log('playback progress: ' + data.elapsedMS + '/' + data.durationMS);
}
```

- `onStopped`
- `onLoading`
- `onPlaying`
- `onPaused`
- `onEnded`
- `onProgress` {elapsedMS, durationMS}
- `onTrackData` ([SoundCloud track JSON](https://developers.soundcloud.com/docs/api/reference#tracks))
- `onInteractionRequired` (player type string)

## DOM

Player containers are created inside the player element specified by the `elementId` option. Each player's container is classed appropriately for it's type and can be styled as needed. The player automatically shows and hides the appropriate containers depending on which player is active. The following is a typical CrossPlayer DOM after initialization:

```html
<div id="unique-id">
	<div class="soundcloud" style="..."><p></p><audio></audio></div>
    <div class="youtube" style="..."><p></p><iframe></iframe></div>
    <div class="weblink" style="..."><audio></audio></div>
    <div class="dropbox" style="..."><audio></audio></div>
</div>
```

Note that the SoundCloud container may have an iFrame instead of an audio tag if there is no `scClientId` options provided. P tags exist in the SoundCloud and YouTube containers to display the user interaction message when required.

## iOS Limitations

Apple requires direct user interaction for playing media files on iOS. That means that when using players within iFrames they cannot be programatically started. Additional user interaction is required. CrossPlayer  uses iFrames for the SoundCloud Widget player and the YouTube player. When loading a URL in this scenario the player will display a message asking for additional user interaction.

The other players make use of the HTML5 `<audio>` tag. Playing this way only functions on iOS when the play method is within a synchronous user action. You cannot start playing a URL automatically. It is best to play within the click-handler of a button:

```html
<button type="button" onclick="player.playUrl('https://www.youtube.com/watch?v=sJ5Of6z08Fs')>Play</button>
```

However, once an `<audio>` element has started playing, all control can be done afterwards including playing a new URL without user interaction.

  

## License

MIT
