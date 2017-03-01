// Utility Functions[1404-1630]
// -----------------

// Run Underscore.js in *noConflict* mode, returning the `_` variable to its
// previous owner. Returns a reference to the Underscore object.
_.noConflict = function() {
  root._ = previousUnderscore;
  return this;
};

// Keep the identity function around for default iteratees.
_.identity = function(value) {
  return value;
};

// Predicate-generating functions. Often useful outside of Underscore.
_.constant = function(value) {
  return function() {
    return value;
  };
};

_.noop = function(){};

_.property = function(path) {
  if (!_.isArray(path)) {
    return shallowProperty(path);
  }
  return function(obj) {
    return deepGet(obj, path);
  };
};

// Generates a function for a given object that returns a given property.
_.propertyOf = function(obj) {
  if (obj == null) {
    return function(){};
  }
  return function(path) {
    return !_.isArray(path) ? obj[path] : deepGet(obj, path);
  };
};

// Returns a predicate for checking whether an object has a given set of
// `key:value` pairs.
_.matcher = _.matches = function(attrs) {
  attrs = _.extendOwn({}, attrs);
  return function(obj) {
    return _.isMatch(obj, attrs);
  };
};

// Run a function **n** times.
_.times = function(n, iteratee, context) {
  var accum = Array(Math.max(0, n));
  iteratee = optimizeCb(iteratee, context, 1);
  for (var i = 0; i < n; i++) accum[i] = iteratee(i);
  return accum;
};

// Return a random integer between min and max (inclusive).
_.random = function(min, max) {
  if (max == null) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

// A (possibly faster) way to get the current timestamp as an integer.
_.now = Date.now || function() {
  return new Date().getTime();
};

// List of HTML entities for escaping.
var escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;'
};
var unescapeMap = _.invert(escapeMap);

// Functions for escaping and unescaping strings to/from HTML interpolation.
var createEscaper = function(map) {
  var escaper = function(match) {
    return map[match];
  };
  // Regexes for identifying a key that needs to be escaped.
  var source = '(?:' + _.keys(map).join('|') + ')';
  var testRegexp = RegExp(source);
  var replaceRegexp = RegExp(source, 'g');
  return function(string) {
    string = string == null ? '' : '' + string;
    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
  };
};
_.escape = createEscaper(escapeMap);
_.unescape = createEscaper(unescapeMap);

// Traverses the children of `obj` along `path`. If a child is a function, it
// is invoked with its parent as context. Returns the value of the final
// child, or `fallback` if any child is undefined.
_.result = function(obj, path, fallback) {
  if (!_.isArray(path)) path = [path];
  var length = path.length;
  if (!length) {
    return _.isFunction(fallback) ? fallback.call(obj) : fallback;
  }
  for (var i = 0; i < length; i++) {
    var prop = obj == null ? void 0 : obj[path[i]];
    if (prop === void 0) {
      prop = fallback;
      i = length; // Ensure we don't continue iterating.
    }
    obj = _.isFunction(prop) ? prop.call(obj) : prop;
  }
  return obj;
};

// Generate a unique integer id (unique within the entire client session).
// Useful for temporary DOM ids.
var idCounter = 0;
_.uniqueId = function(prefix) {
  var id = ++idCounter + '';
  return prefix ? prefix + id : id;
};

// By default, Underscore uses ERB-style template delimiters, change the
// following template settings to use alternative delimiters.
_.templateSettings = {
  evaluate: /<%([\s\S]+?)%>/g,
  interpolate: /<%=([\s\S]+?)%>/g,
  escape: /<%-([\s\S]+?)%>/g
};

// When customizing `templateSettings`, if you don't want to define an
// interpolation, evaluation or escaping regex, we need one that is
// guaranteed not to match.
var noMatch = /(.)^/;

// Certain characters need to be escaped so that they can be put into a
// string literal.
var escapes = {
  "'": "'",
  '\\': '\\',
  '\r': 'r',
  '\n': 'n',
  '\u2028': 'u2028',
  '\u2029': 'u2029'
};

var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

var escapeChar = function(match) {
  return '\\' + escapes[match];
};

// JavaScript micro-templating, similar to John Resig's implementation.
// Underscore templating handles arbitrary delimiters, preserves whitespace,
// and correctly escapes quotes within interpolated code.
// NB: `oldSettings` only exists for backwards compatibility.
_.template = function(text, settings, oldSettings) {
  if (!settings && oldSettings) settings = oldSettings;
  settings = _.defaults({}, settings, _.templateSettings);

  // Combine delimiters into one regular expression via alternation.
  var matcher = RegExp([
    (settings.escape || noMatch).source,
    (settings.interpolate || noMatch).source,
    (settings.evaluate || noMatch).source
  ].join('|') + '|$', 'g');

  // Compile the template source, escaping string literals appropriately.
  var index = 0;
  var source = "__p+='";
  text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
    source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
    index = offset + match.length;

    if (escape) {
      source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
    } else if (interpolate) {
      source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
    } else if (evaluate) {
      source += "';\n" + evaluate + "\n__p+='";
    }

    // Adobe VMs need the match returned to produce the correct offset.
    return match;
  });
  source += "';\n";

  // If a variable is not specified, place data values in local scope.
  if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

  source = "var __t,__p='',__j=Array.prototype.join," +
    "print=function(){__p+=__j.call(arguments,'');};\n" +
    source + 'return __p;\n';

  var render;
  try {
    render = new Function(settings.variable || 'obj', '_', source);
  } catch (e) {
    e.source = source;
    throw e;
  }

  var template = function(data) {
    return render.call(this, data, _);
  };

  // Provide the compiled source as a convenience for precompilation.
  var argument = settings.variable || 'obj';
  template.source = 'function(' + argument + '){\n' + source + '}';

  return template;
};

// Add a "chain" function. Start chaining a wrapped Underscore object.
_.chain = function(obj) {
  var instance = _(obj);
  instance._chain = true;
  return instance;
};
