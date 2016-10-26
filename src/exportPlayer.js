/**
 * This is the exported player which allows only limited access to the main player
 * @param options
 */
var exportPlayer = function( options )
{
    this._player = new basePlayer( options );
};

exportPlayer.prototype.playUrl = function( url )
{
    return this._player.playUrl( url );
};

exportPlayer.prototype.play = function()
{
    return this._player.play();
};

exportPlayer.prototype.pause = function()
{
    return this._player.pause();
};

exportPlayer.prototype.togglePlayPause = function()
{
    return this._player.togglePlayPause();
};

exportPlayer.prototype.seek = function( positionMS )
{
    return this._player.seek( positionMS );
};

exportPlayer.prototype.stop = function()
{
    return this._player.stop();
};

exportPlayer.prototype.onStopped = function( callback )
{
    return this._player.onStopped( callback );
};

exportPlayer.prototype.onLoading = function( callback )
{
    return this._player.onLoading( callback );
};

exportPlayer.prototype.onPlaying = function( callback )
{
    return this._player.onPlaying( callback );
};

exportPlayer.prototype.onPaused = function( callback )
{
    return this._player.onPaused( callback );
};

exportPlayer.prototype.onEnded = function( callback )
{
    return this._player.onEnded( callback );
};

exportPlayer.prototype.onProgress = function( callback )
{
    return this._player.onProgress( callback );
};

exportPlayer.prototype.onTrackData = function( callback )
{
    return this._player.onTrackData( callback );
};

exportPlayer.prototype.onInteractionRequired = function( callback )
{
    return this._player.onInteractionRequired( callback );
};