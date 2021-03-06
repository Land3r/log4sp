/**
 * Metatag Appender writing the logs to meta tags
 *
 * @extends Log4sp.Appender
 * @constructor
 * @param logger log4sp instance this appender is attached to
 * @author Stephan Strittmatter
 */
Log4sp.MetatagAppender = function() {
	this.currentLine = 0;
};
Log4sp.MetatagAppender.prototype = Log4sp.extend(new Log4sp.Appender(), /** @lends Log4sp.MetatagAppender# */ {
	/**
	 * @param loggingEvent event to be logged
	 * @see Log4sp.Appender#doAppend
	 */
	doAppend: function(loggingEvent) {
		var now = new Date();
		var lines = loggingEvent.message.split("\n");
		var headTag = document.getElementsByTagName("head")[0];

		for (var i = 1; i <= lines.length; i++) {
			var value = lines[i - 1];
			if (i == 1) {
				value = loggingEvent.level.toString() + ": " + value;
			} else {
				value = "> " + value;
			}

			var metaTag = document.createElement("meta");
			metaTag.setAttribute("name", "X-log4sp:" + this.currentLine);
			metaTag.setAttribute("content", value);
			headTag.appendChild(metaTag);
			this.currentLine += 1;
		}
	},

	/** 
	 * toString
	 */
	 toString: function() {
	 	return "Log4sp.MetatagAppender"; 
	 }
});
