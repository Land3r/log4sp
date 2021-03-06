/**
 * AJAX Appender sending {@link Log4sp.LoggingEvent}s asynchron via 
 * <code>XMLHttpRequest</code> to server.<br />
 * The {@link Log4sp.LoggingEvent} is POSTed as response content and is 
 * formatted by the accociated layout. Default layout is {@link Log4sp.XMLLayout}. 
 * The <code>threshold</code> defines when the logs 
 * should be send to the server. By default every event is sent on its
 * own (threshold=1). If it is set to 10, then the events are send in groups of
 * 10 events.
 *
 * @extends Log4sp.Appender 
 * @constructor
 * @param {Log4sp.Logger} logger log4sp instance this appender is attached to
 * @param {String} loggingUrl url where appender will post log messages to
 * @author Stephan Strittmatter
 */
Log4sp.AjaxAppender = function(loggingUrl) {

	/**
	 * is still esnding data to server
	 * @type boolean
	 * @private
	 */
	this.isInProgress = false;
	
	/**
	 * @type String
	 * @private
	 */
	this.loggingUrl = loggingUrl || "logging.log4sp";
	
	/**
	 * @type Integer
	 * @private
	 */
	this.threshold = 1;
	
	/**
	 * timeout when request is aborted.
	 * @private
	 */
	this.timeout = 2000;
	
	/**
	 * List of LoggingEvents which should be send after threshold is reached.
	 * @type Map
	 * @private
	 */
	this.loggingEventMap = new Log4sp.FifoBuffer();

	/**
	 * @type Log4sp.Layout
	 * @private
	 */
	this.layout = new Log4sp.XMLLayout();
	/**
	 * @type XMLHttpRequest
	 * @private
	 */	
	this.httpRequest = null;
};

Log4sp.AjaxAppender.prototype = Log4sp.extend(new Log4sp.Appender(), /** @lends Log4sp.AjaxAppender# */ {
	/**
	 * sends the logs to the server
	 * @param loggingEvent event to be logged
	 * @see Log4sp.Appender#doAppend
	 */
	doAppend: function(loggingEvent) {
		log4spLogger && log4spLogger.trace("> AjaxAppender.append");
	
		if (this.loggingEventMap.length() <= this.threshold || this.isInProgress === true) {
			this.loggingEventMap.push(loggingEvent);
		}
		
		if(this.loggingEventMap.length() >= this.threshold && this.isInProgress === false) {
			//if threshold is reached send the events and reset current threshold
			this.send();
		}
		
		log4spLogger && log4spLogger.trace("< AjaxAppender.append");
	},
	
	/** @see Appender#doClear */
	doClear: function() {
		log4spLogger && log4spLogger.trace("> AjaxAppender.doClear" );
		if(this.loggingEventMap.length() > 0) {
			this.send();
		}
		log4spLogger && log4spLogger.trace("< AjaxAppender.doClear" );
	},
	
	/**
	 * Set the threshold when logs have to be send. Default threshold is 1.
	 * @praram {int} threshold new threshold
	 */
	setThreshold: function(threshold) {
		log4spLogger && log4spLogger.trace("> AjaxAppender.setThreshold: " + threshold );
		this.threshold = threshold;
		log4spLogger && log4spLogger.trace("< AjaxAppender.setThreshold" );
	},
	
	/**
	 * Set the timeout in milli seconds until sending request is aborted.
	 * Default is 2000 ms.
	 * @param {int} milliseconds the new timeout
	 */
	setTimeout: function(milliseconds) {
		this.timeout = milliseconds;
	},
	
	/**
	 * send the request.
	 */
	send: function() {
		if(this.loggingEventMap.length() >0) {
			
			log4spLogger && log4spLogger.trace("> AjaxAppender.send");
			
			
			this.isInProgress = true;
			var a = [];
	
			for(var i = 0; i < this.loggingEventMap.length() && i < this.threshold; i++) {
				a.push(this.layout.format(this.loggingEventMap.pull()));
			} 
					
			var content = this.layout.getHeader();	
			content += a.join(this.layout.getSeparator());
			content += this.layout.getFooter();
			
			var appender = this;
			if(this.httpRequest === null){
				this.httpRequest = this.getXmlHttpRequest();
			}
			this.httpRequest.onreadystatechange = function() {
				appender.onReadyStateChanged.call(appender);
			};
			
			this.httpRequest.open("POST", this.loggingUrl, true);
			// set the request headers.
			//this.httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			this.httpRequest.setRequestHeader("Content-type", this.layout.getContentType());
			//REFERER will be the top-level
			// URI which may differ from the location of the error if
			// it occurs in an included .js file
			this.httpRequest.setRequestHeader("REFERER", location.href);
	 		this.httpRequest.setRequestHeader("Content-length", content.length);
			this.httpRequest.setRequestHeader("Connection", "close");
			this.httpRequest.send( content );
			
			appender = this;
			
			try {
				window.setTimeout(function(){
					log4spLogger && log4spLogger.trace("> AjaxAppender.timeout");
					appender.httpRequest.onreadystatechange = function(){return;};
					appender.httpRequest.abort();
					//this.httpRequest = null;
					appender.isInProgress = false;
		
					if(appender.loggingEventMap.length() > 0) {
						appender.send();
					}
					log4spLogger && log4spLogger.trace("< AjaxAppender.timeout");
				}, this.timeout);
			} catch (e) {
				log4spLogger && log4spLogger.fatal(e);
			}
			log4spLogger && log4spLogger.trace("> AjaxAppender.send");
		}
	},
	
	/**
	 * @private
	 */
	onReadyStateChanged: function() {
		log4spLogger && log4spLogger.trace("> AjaxAppender.onReadyStateChanged");
		var req = this.httpRequest;
		if (this.httpRequest.readyState != 4) { 
			log4spLogger && log4spLogger.trace("< AjaxAppender.onReadyStateChanged: readyState " + req.readyState + " != 4");
			return; 
		}
		
		var success = ((typeof req.status === "undefined") || req.status === 0 || (req.status >= 200 && req.status < 300));
		
		if (success) {
			log4spLogger && log4spLogger.trace("  AjaxAppender.onReadyStateChanged: success");

			//ready sending data
			this.isInProgress = false;

		} else {
			var msg = "  AjaxAppender.onReadyStateChanged: XMLHttpRequest request to URL " + this.loggingUrl + " returned status code " + this.httpRequest.status;
			log4spLogger && log4spLogger.error(msg);
		}
		
		log4spLogger && log4spLogger.trace("< AjaxAppender.onReadyStateChanged: readyState == 4");		
	},
	/**
	 * Get the XMLHttpRequest object independent of browser.
	 * @private
	 */
	getXmlHttpRequest: function() {
		log4spLogger && log4spLogger.trace("> AjaxAppender.getXmlHttpRequest");
		
		var httpRequest = false;

		try {		
			if (window.XMLHttpRequest) { // Mozilla, Safari, IE7...
					httpRequest = new XMLHttpRequest();
				if (httpRequest.overrideMimeType) {
					httpRequest.overrideMimeType(this.layout.getContentType());
				}
			} else if (window.ActiveXObject) { // IE
				try {
					httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
				} catch (e) {
					httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
				}
			}
		} catch (e) {
			httpRequest = false;
		}
		
		if (!httpRequest) {
			log4spLogger && log4spLogger.fatal("Unfortunately, your browser does not support AjaxAppender for log4sp!");
		}
		
		log4spLogger && log4spLogger.trace("< AjaxAppender.getXmlHttpRequest");
		return httpRequest;
	},
	
	/** 
	 * toString
	 */
	 toString: function() {
	 	return "Log4sp.AjaxAppender[loggingUrl=" + this.loggingUrl + ", threshold=" + this.threshold + "]"; 
	 }
});
