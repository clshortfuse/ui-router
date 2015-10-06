/// <reference path='../../typings/angularjs/angular.d.ts' />
let { isDefined, isFunction, isNumber, isString, isObject, isArray, forEach, extend, copy, noop, toJson, fromJson, equals, identity } = angular;
export { isDefined, isFunction, isNumber, isString, isObject, isArray, forEach, extend, copy, noop, toJson, fromJson, equals, identity };

type Mapper<X, T> = (x: X, key?: (string|number)) => T;
export interface TypedMap<T> { [key: string]: T; }
export type Predicate<X> = (X) => boolean;
export type IInjectable = (Function|any[]);

export var abstractKey = 'abstract';

// Stolen from: http://stackoverflow.com/questions/4394747/javascript-curry-function
export function curry(fn: Function): Function {
  let initial_args = [].slice.apply(arguments, [1]);
  let func_args_length = fn.length;

  function curried(args) {
    if (args.length >= func_args_length)
      return fn.apply(null, args);
    return function () {
      return curried(args.concat([].slice.apply(arguments)));
    };
  }
  return curried(initial_args);
}

/**
 * Given a varargs list of functions, returns a function that is composes the argument functions, right-to-left
 * given: f(x), g(x), h(x)
 * let composed = compose(f,g,h)
 * then, composed is: f(g(h(x)))
 */
export function compose() {
  let args = arguments;
  let start = args.length - 1;
  return function() {
    let i = start, result = args[start].apply(this, arguments);
    while (i--) result = args[i].call(this, result);
    return result;
  };
}

/**
 * Given a varargs list of functions, returns a function that is composes the argument functions, left-to-right
 * given: f(x), g(x), h(x)
 * let piped = pipe(f,g,h);
 * then, piped is: h(g(f(x)))
 */
export function pipe(...funcs: Function[]): (obj: any) => any {
  return compose.apply(null, [].slice.call(arguments).reverse());
}

/**
 * Given a property name, returns a function that returns that property from an object
 * let obj = { foo: 1, name: "blarg" };
 * let getName = prop("name");
 * getName(obj) === "blarg"
 */
export const prop = (name: string) => (obj: any) => obj && obj[name];

/**
 * Given a dotted property name, returns a function that returns a nested property from an object, or undefined
 * let obj = { id: 1, nestedObj: { foo: 1, name: "blarg" }, };
 * let getName = prop("nestedObj.name");
 * getName(obj) === "blarg"
 * let propNotFound = prop("this.property.doesnt.exist");
 * propNotFound(obj) === undefined
 */
export const parse = (name: string) => pipe.apply(null, name.split(".").map(prop));

/**
 * Given a function that returns a truthy or falsey value, returns a
 * function that returns the opposite (falsey or truthy) value given the same inputs
 */
export const not = (fn) => (function() { return !fn.apply(null, [].slice.call(arguments)); });

/**
 * Given two functions that return truthy or falsey values, returns a function that returns truthy
 * if both functions return truthy for the given arguments
 */
export function and(fn1, fn2): Function {
  return function() {
    return fn1.apply(null, [].slice.call(arguments)) && fn2.apply(null, [].slice.call(arguments));
  };
}

/**
 * Given two functions that return truthy or falsey values, returns a function that returns truthy
 * if at least one of the functions returns truthy for the given arguments
 */
export function or(fn1, fn2): Function {
  return function() {
    return fn1.apply(null, [].slice.call(arguments)) || fn2.apply(null, [].slice.call(arguments));
  };
}

/** Given a class, returns a Predicate function that returns true if the object is of that class */
export const is: (ctor) => Predicate<any> = ctor => obj => (obj != null && obj.constructor === ctor || obj instanceof ctor);

/** Given a value, returns a Predicate function that returns true if another value is === equal to the original value */
export const eq: (comp) => Predicate<any> = (val) => (other) => val === other;

/** Given a value, returns a function which returns the value */
export const val = <T> (v: T) => () => v;

export function invoke(fnName: string): Function;
export function invoke(fnName: string, args: any[]): Function;
export function invoke(fnName: string, args?): Function {
  return (obj: any) => obj[fnName].apply(obj, args);
}

export function pattern(struct: Function[][]): Function {
  return function(val) {
    for (var i = 0; i < struct.length; i++) {
      if (struct[i][0](val)) return struct[i][1](val);
    }
  };
}


/**
 * protoypal inheritance helper.
 * Creates a new object which has `parent` object as its prototype, and then copies the properties from `extra` onto it
 */
export const inherit = (parent, extra) => extend(new (extend(function() {}, { prototype: parent }))(), extra);

/**
 * Given an arguments object, converts the arguments at index idx and above to an array.
 * This is similar to es6 rest parameters.
 *
 * Optionally, the argument at index idx may itself already be an array.
 *
 * For example,
 * given either:
 *        arguments = [ obj, "foo", "bar" ]
 * or:
 *        arguments = [ obj, ["foo", "bar"] ]
 * then:
 *        restArgs(arguments, 1) == ["foo", "bar"]
 *
 * This allows functions like pick() to be implemented such that it allows either a bunch
 * of string arguments (like es6 rest parameters), or a single array of strings:
 *
 * given:
 *        var obj = { foo: 1, bar: 2, baz: 3 };
 * then:
 *        pick(obj, "foo", "bar");   // returns { foo: 1, bar: 2 }
 *        pick(obj, ["foo", "bar"]); // returns { foo: 1, bar: 2 }
 */
const restArgs = (args, idx = 0) => Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(args, idx));

/** Given an array, returns true if the object is found in the array, (using indexOf) */
const inArray = (array: any[], obj: any) => array.indexOf(obj) !== -1;

/** Given an array, an an item, if the item is found in the array, it removes it (in-place).  The same array is returned */
export const removeFrom = (array: any[]) => (obj) => {
  let idx = array.indexOf(obj);
  if (idx >= 0) array.splice(idx, 1);
  return array;
};

/**
 * Applies a set of defaults to an options object.  The options object is filtered
 * to only those properties of the objects in the defaultsList.
 * Earlier objects in the defaultsList take precedence when applying defaults.
 */
export function defaults(opts = {}, ...defaultsList) {
  let defaults = merge.apply(null, [{}].concat(defaultsList));
  return extend({}, defaults, pick(opts || {}, Object.keys(defaults)));
}

/**
 * Merges properties from the list of objects to the destination object.
 * If a property already exists in the destination object, then it is not overwritten.
 */
export function merge(dst, ...objs: Object[]) {
  forEach(objs, function(obj) {
    forEach(obj, function(value, key) {
      if (!dst.hasOwnProperty(key)) dst[key] = value;
    });
  });
  return dst;
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
export function ancestors(first, second) {
  let path = [];

  for (var n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }
  return path;
}

/**
 * Performs a non-strict comparison of the subset of two objects, defined by a list of keys.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @param {Array} keys The list of keys within each object to compare. If the list is empty or not specified,
 *                     it defaults to the list of keys in `a`.
 * @return {Boolean} Returns `true` if the keys match, otherwise `false`.
 */
export function equalForKeys(a, b, keys: string[] = Object.keys(a)) {
  for (var i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (a[k] != b[k]) return false; // Not '===', values aren't necessarily normalized
  }
  return true;
}

// Return a copy of the object only containing the whitelisted properties.
type PickOmitPredicate = (keys: string[], key) => boolean;
function pickOmitImpl(predicate: PickOmitPredicate, obj) {
  let objCopy = {}, keys = restArgs(arguments, 2);
  for (var key in obj) {
    if (predicate(keys, key)) objCopy[key] = obj[key];
  }
  return objCopy;
}

export function pick(obj, propNames: string[]): Object;
export function pick(obj, ...propName: string[]): Object;
export function pick(obj) { return pickOmitImpl.apply(null, [inArray].concat(restArgs(arguments))); }

export function omit(obj, propNames: string[]): Object;
export function omit(obj, ...propName: string[]): Object;
export function omit(obj) { return pickOmitImpl.apply(null, [not(inArray)].concat(restArgs(arguments))); }

export function pluck(collection: any[], propName: string): any[];
export function pluck(collection: TypedMap<any>, propName: string): TypedMap<any>;
export function pluck(collection, propName): any {
  return map(collection, <Mapper<any, string>> prop(propName));
}

/**
 * Given an array or object, return a new array or object with:
 * - array: only the elements which passed the callback predicate
 * - object: only the properties that passed the callback predicate
 */
export function filter<T>(collection: T[], callback: Predicate<T>): T[];
export function filter<T>(collection: TypedMap<T>, callback: Predicate<T>): TypedMap<T>;
export function filter<T>(collection: T, callback: Function): T {
  let arr = isArray(collection), result: any = arr ? [] : {};
  let accept = arr ? x => result.push(x) : (x, key) => result[key] = x;
  forEach(collection, function(item, i) {
    if (callback(item, i)) accept(item, i);
  });
  return <T>result;
}

/**
 * Given an array or object, return a new array or object with:
 * - array: only the elements which passed the callback predicate
 * - object: only the properties that passed the callback predicate
 */
export function find<T>(collection: TypedMap<T>, callback: Predicate<T>): T;
export function find<T>(collection: T[], callback: Predicate<T>): T;
export function find(collection, callback) {
  let result;

  forEach(collection, function(item, i) {
    if (result) return;
    if (callback(item, i)) result = item;
  });

  return result;
}

export function map<T, U>(collection: T[], callback: Mapper<T, U>): U[];
export function map<T, U>(collection: TypedMap<T>, callback: Mapper<T, U>): TypedMap<U>;
export function map(collection: any, callback: any): any {
  let result = isArray(collection) ? [] : {};
  forEach(collection, (item, i) => result[i] = callback(item, i));
  return result;
}

/** Push an object to an array, return the array */
export const push      = (arr: any[], obj) => { arr.push(obj); return arr; };
/** Reduce function which un-nests a single level of arrays */
export const unnestR   = (memo: any[], elem) => memo.concat(elem);
/** Reduce function which recursively un-nests all arrays */
export const flattenR  = (memo: any[], elem) => isArray(elem) ? memo.concat(elem.reduce(flattenR, [])) : push(memo, elem);
/** Return a new array with a single level of arrays unnested. */
export const unnest    = (arr: any[]) => arr.reduce(unnestR, []);
/** Return a completely flattened version of an array. */
export const flatten   = (arr: any[]) => arr.reduce(flattenR, []);

/**
 * Given a .filter Predicate, builds a .filter Predicate which throws an error if any elements do not pass.
 */
export function assertPredicate<T>(fn: Predicate<T>, errMsg: string = "assert failure"): Predicate<T> {
  return (obj: T) => {
    if (!fn(obj)) throw new Error(errMsg);
    return true;
  };
}

/** Like _.pairs: Given an object, returns an array of key/value pairs */
export const pairs = (object) => Object.keys(object).map(key => [ key, object[key]] );

/**
 * Sets a key/val pair on an object, then returns the object.
 *
 * Use as a reduce function for an array of key/val pairs
 *
 * Given:
 * var keys = [ "fookey", "barkey" ]
 * var pairsToObj = keys.reduce((memo, key) => applyPairs(memo, key, true), {})
 * Then:
 * true === angular.equals(pairsToObj, { fookey: true, barkey: true })
 */
export function applyPairs(obj: TypedMap<any>, arrayOrKey: string, val: any);
/**
 * Sets a key/val pair on an object, then returns the object.
 *
 * Use as a reduce function for an array of key/val pairs
 *
 * Given:
 * var pairs = [ ["fookey", "fooval"], ["barkey","barval"] ]
 * var pairsToObj = pairs.reduce((memo, pair) => applyPairs(memo, pair), {})
 * // or simply: pairs.reduce(applyPairs, {})
 * Then:
 * true === angular.equals(pairsToObj, { fookey: "fooval", barkey: "barval" })
 */
export function applyPairs(obj: TypedMap<any>, arrayOrKey: any[]);
export function applyPairs(obj: TypedMap<any>, arrayOrKey: (string|any[]), val?: any) {
  let key;
  if (isDefined(val)) key = arrayOrKey;
  if (isArray(arrayOrKey)) [key, val] = <any[]> arrayOrKey;
  if (!isString(key)) throw new Error("invalid parameters to applyPairs");
  obj[key] = val;
  return obj;
}

// Checks if a value is injectable
export function isInjectable(val) {
  if (isArray(val) && val.length) {
    let head = val.slice(0, -1), tail = val.slice(-1);
    if (head.filter(not(isString)).length || tail.filter(not(isFunction)).length)
      return false;
  }
  return isFunction(val);
}

export const isNull = o => o === null;

export const isPromise = and(isObject, pipe(prop('then'), isFunction));

export function fnToString(fn: IInjectable) {
  let _fn = pattern([
    [isArray, arr => arr.slice(-1)[0]],
    [val(true), identity]
  ])(fn);

  return _fn && _fn.toString() || "undefined";
}

export function maxLength(max: number, str: string) {
  if (str.length <= max) return str;
  return str.substr(0, max - 3) + "...";
}

export function padString(length: number, str: string) {
  while (str.length < length) str += " ";
  return str;
}


/**
 * @ngdoc overview
 * @name ui.router.util
 *
 * @description
 * # ui.router.util sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.util', ['ng']);

/**
 * @ngdoc overview
 * @name ui.router.router
 *
 * @requires ui.router.util
 *
 * @description
 * # ui.router.router sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 */
angular.module('ui.router.router', ['ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router.state
 *
 * @requires ui.router.router
 * @requires ui.router.util
 *
 * @description
 * # ui.router.state sub-module
 *
 * This module is a dependency of the main ui.router module. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.state', ['ui.router.router', 'ui.router.util', 'ui.router.angular1']);

/**
 * @ngdoc overview
 * @name ui.router
 *
 * @requires ui.router.state
 *
 * @description
 * # ui.router
 *
 * ## The main module for ui.router
 * There are several sub-modules included with the ui.router module, however only this module is needed
 * as a dependency within your angular app. The other modules are for organization purposes.
 *
 * The modules are:
 * * ui.router - the main "umbrella" module
 * * ui.router.router -
 *
 * *You'll need to include **only** this module as the dependency within your angular app.*
 *
 * <pre>
 * <!doctype html>
 * <html ng-app="myApp">
 * <head>
 *   <script src="js/angular.js"></script>
 *   <!-- Include the ui-router script -->
 *   <script src="js/angular-ui-router.min.js"></script>
 *   <script>
 *     // ...and add 'ui.router' as a dependency
 *     var myApp = angular.module('myApp', ['ui.router']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */
angular.module('ui.router', ['ui.router.state', 'ui.router.angular1']);

angular.module('ui.router.compat', ['ui.router']);