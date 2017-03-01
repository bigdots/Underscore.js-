//     Underscore.js 1.8.3

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  /**
   * 建立全局对象；在浏览器中是self（即window）对象，在服务器端是global，在某些虚拟机上是this；之所以用用self代替window是为了支持Web Worker
   * WebWorker是h5的api，为Web内容在后台线程中运行脚本提供了一种简单的方法。线程可以执行任务而不干扰用户界面。
   * 对于 WebWorker，最顶层的对象的对象并不是window，它无法访问window以及与window相关的DOM API，
   * WebWorker的根对象是WorkerGlobalScope，它有个self属性指向其本身
   */
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            this ||
            {};

  // Save the previous value of the `_` variable.
  // 保存当前_的值
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  // 将所有数据类型的prototype赋值给变量，便于压缩（Object.prototype.xxx = ...这种代码是不可压缩的，Object,prototype这些名字改了浏览器就不认得了。）
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.
  // 将核心原型方法赋值给变量
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  // 将我们可能会使用到的原生es5方法赋值给变量
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  /**
   * instanceof 判断对象是否是特定类的一个实例
   * 构造函数；
   * 是_的实例，直接返回；
   * 第二句，它主要针对的是不加 new 关键字就可以创建实例的情况,不加 new ,内部的 this 指向的是全局对象
   *将传入的 obj 保存到实例对象的 _wrapped 属性中
   */
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for their old module API. If we're in
  // the browser, add `_` as a global object.
  // (`nodeType` is checked to ensure that `module`
  // and `exports` are not HTML elements.)
  /**
   * 为nodejs导出 Underscore 对象
   * 针对不同的宿主环境, 将Undersocre的命名变量存放到不同的对象中。对外暴露_对象
   */
  if (typeof exports != 'undefined' && !exports.nodeType) {
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  // 当前版本号
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  // 内部函数，返回一个优化的回调函数，重复应用于其他 Underscore 函数
  /**
   * [optimizeCb description]
   * @param  {[type]} func     [待优化的回调函数]
   * @param  {[type]} context  [执行上下文]
   * @param  {[type]} argCount [回调函数中参数的个数]
   * @return {[type]}          [description]
   */
  var optimizeCb = function(func, context, argCount) {
    // 该函数的主要作用就是为回调函数绑定上下文，所以如果没有指定上下文，则直接将其返回
    // void 0 执行后返回undefined
    // call
    // apply 第二个参数只能是数组
    if (context === void 0) return func;

    // 对argCount的个数进行分类讨论
    switch (argCount) {
      case 1: return function(value) {
        //   只有一个参数
        return func.call(context, value);
      };
      // The 2-parameter case has been omitted only because no current consumers
      // made use of it.
      // 之所以不讨论2个参数的情况，是因为当前没有出现这种情况
      case null:
      case 3: return function(value, index, collection) {
          //有三个参数
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
          //有四个参数
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  var builtinIteratee;

  // An internal function to generate callbacks that can be applied to each
  // element in a collection, returning the desired result — either `identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  /**
   * [cb description]
   * @param  {[type]}   value    [description]
   * @param  {[type]}   context  [执行上下文]
   * @param  {[type]}   argCount [参数个数]
   * @return {Function}          [description]
   * 这也是一个内部函数，对参数进行了判断：
   * 如果是函数则调用optimizeCb进行处理；
   * 如果是对象则返回一个能判断对象是否相等的函数；
   * 默认返回一个获取对象属性的函数。
   */
  var cb = function(value, context, argCount) {
    if (_.iteratee !== builtinIteratee) return _.iteratee(value, context);
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value) && !_.isArray(value)) return _.matcher(value);
    return _.property(value);
  };

  // External wrapper for our callback generator. Users may customize
  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
  // This abstraction hides the internal-only argCount argument.
  // 对回调函数构造器做一个外部包裹，用户可以定制
  // 这层抽象隐藏了argCount参数
  _.iteratee = builtinIteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
  // This accumulates the arguments passed into an array, after a given index.
  var restArgs = function(func, startIndex) {
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function() {
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  // 判断某个类型的属性是否存在,如何
  /**
   * [shallowProperty 取一个数据类型的某个属性值]
   * @param  {[type]} key [属性]
   * @return {[type]}     [函数，该函数返回属性值]
   */
  var shallowProperty = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  var deepGet = function(obj, path) {
    var length = path.length;
    for (var i = 0; i < length; i++) {
      if (obj == null) return void 0;
      obj = obj[path[i]];
    }
    return length ? obj : void 0;
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  // Math.pow返回底数的指定次幂,MAX_ARRAY_INDEX是js精确整数的最大值
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = shallowProperty('length');
  /**
   * [isArrayLike collection的辅助方法，用于判断集合是应该作为数组还是作为对象处理]
   * @param  {[type]}  collection [传入一个collection]
   * @return {Boolean}            [类似数组则返回true，否则返回false]
   */
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // OOP 链式调用
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var chainResult = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return chainResult(this, func.apply(_, args));
      };
    });
    return _;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return chainResult(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return chainResult(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return String(this._wrapped);
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define == 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }

}());
