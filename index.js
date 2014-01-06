'use strict';

var PassThrough = require('stream').PassThrough;

module.exports = function (param) {

	var through = new PassThrough();

	through.pipe = pipe2;

	function preventDefaultErrorHandler(stream) {
		stream.listeners('error').forEach(function(item) {
        	if(item.name == 'onerror') this.removeListener('error', item);
	    }, stream);
	}

	through.on('pipe', function (source) {
		preventDefaultErrorHandler(source);
	};

	function pipe2(dest, options) {
		var source = this;

		function ondata(chunk) {
			if (dest.writable) {
				if (false === dest.write(chunk) && source.pause) {
					source.pause();
				}
			}
		}

		source.on('data', ondata);

		function ondrain() {
			if (source.readable && source.resume) {
				source.resume();
			}
		}

		dest.on('drain', ondrain);

		// If the 'end' option is not supplied, dest.end() will be called when
		// source gets the 'end' or 'close' events.  Only dest.end() once.
		if (!dest._isStdio && (!options || options.end !== false)) {
			source.on('end', onend);
			source.on('close', onclose);
		}

		var didOnEnd = false;
		function onend() {
			if (didOnEnd) return;
			didOnEnd = true;

			dest.end();
		}


		function onclose() {
			if (didOnEnd) return;
			didOnEnd = true;

			if (util.isFunction(dest.destroy)) dest.destroy();
		}

		// don't leave dangling pipes when there are errors.
		function onerror(er) {
			if (EE.listenerCount(this, 'error') === 0) {
				cleanup();
				throw er; // Unhandled stream error in pipe.
			}
		}

		source.on('error', onerror);
		dest.on('error', onerror);

		// remove all the event listeners that were added.
		function cleanup() {
			source.removeListener('data', ondata);
			dest.removeListener('drain', ondrain);

			source.removeListener('end', onend);
			source.removeListener('close', onclose);

			source.removeListener('error', onerror);
			dest.removeListener('error', onerror);

			source.removeListener('end', cleanup);
			source.removeListener('close', cleanup);

			dest.removeListener('close', cleanup);
		}

		source.on('end', cleanup);
		source.on('close', cleanup);

		dest.on('close', cleanup);

		dest.emit('pipe', source);

		// Allow for unix-like usage: A.pipe(B).pipe(C)

		dest.pipe = pipe2;

		return dest;
	};

	return through;

};