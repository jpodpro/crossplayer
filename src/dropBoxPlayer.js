/**
 * DropBox player class - default constructor
 */
var dropBoxPlayer = function( options, player )
{
    this._type = 'dropbox';
    this._player = player;
    this._options = options;
    this._firstPlay = true;

    this.initAudioElement( 'dropbox' );
};

// dropbox player inherits from web link player since it behaves almost identically
dropBoxPlayer.prototype = Object.create( webLinkPlayer.prototype );


/**
 * Plays the given URL
 */
dropBoxPlayer.prototype.playUrl = function( url )
{
    // format link
    url = url.replace( /\?.*/g, '' );
    url += '?dl=1';

    this._audioElement.setAttribute( 'src', url );
    this._audioElement.play();
};