ko.firebase
===========

Map a primitive value stored in a Firebase ref to a [Knockout](http://knockoutjs.com/) observable.

Similar to [knockoutFire](https://github.com/hiroshi/knockoutFire) or [knockout-sync](https://github.com/Zenovations/knockout-sync) except instead of starting with observables and bolting on synchronization, `ko.firebase` produces observables directly from `Firebase` instances. The result is an observables (or observablesArray) that stay in sync with Firebase for both reads and writes.

It extends Firebase instances to add methods to get a knockout observable (for primitive values) or an observableArray of observables (for sets of primitives) from a Firebase location:

```JavaScript
var firebase = new Firebase('...');
var foobarObservable = firebase.child('foobar').asObservable();
// or: var foobarObservable = ko.firebase.observable(firebase.child('foobar'));
```

Which means you can end up with a bidirectionally synchronized textfield with just:

```HTML
...
<input type="text" data-bind="value: foobar">
...
```

```JavaScript
ko.applyBindings({
	foobar: foobarObservable
});
```

## About

by Erik Beeson; MIT License. Feedback appreciated. Check out my other Firebase projects on github. Find me in #firebase on freenode or firebase-talk@googlegroups.com

Untested, unsupported; use at your own risk.
