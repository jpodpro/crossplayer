/**
 * Abstract Player Class.
 * Defines methods that all inheriting players must implement
 * @param options
 * @param player
 */
var abstractPlayer = function( options, player )
{

}


/**
 * Plays the given URL
 * @param url
 */
abstractPlayer.prototype.playUrl = function( url )
{
    throw new Error( 'Load method not implemented' );
}


/**
 * Play method
 */
abstractPlayer.prototype.play = function()
{
    throw new Error( 'Play method not implemented' );
}


/**
 * Pause method
 */
abstractPlayer.prototype.pause = function()
{
    throw new Error( 'Pause method not implemented' );
}


/**
 * Stop method
 */
abstractPlayer.prototype.stop = function()
{
    throw new Error( 'Stop method not implemented' );
}


/**
 * Get Progress method
 * @param callback
 */
abstractPlayer.prototype.getProgress = function( callback )
{
    throw new Error( 'Get progress method not implemented' );
}


/**
 * Seek method
 * @param positionMS
 */
abstractPlayer.prototype.seek = function( positionMS )
{
    throw new Error( 'Seek method not implemented' );
}