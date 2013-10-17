/**
 * Firebase extensions for KnockoutJS by Erik Beeson.
 * 
 * MIT Licensed, 2013; respectful attribution appreciated.
 */


ko.firebase = ko.firebase || {};


/**
 * Return an observable (technically a (Writable Computed Observable)[http://knockoutjs.com/documentation/computedObservables.html#writeable_computed_observables])
 * that has the value of the given ref and sets the ref on write.
 * 
 * Optionally takes an initial value.
 * 
 * Adds an `off` method that unbinds the Firebase `value` event handler and a `_ref` property with the original Firebase ref.
 */
ko.firebase.observable = function(ref, value) {
	var observable = ko.observable(value);
	var computed = ko.computed({
		read: observable,
		write: Firebase.prototype.set,
		owner: ref
	});
	var handler = function(snapshot) { observable(snapshot.val()); };
	ref.on('value', handler);
	computed.off = function() {
		ref.off('value', handler);
	};
	computed._ref = ref;
	return computed;
};


/**
 * Takes a Firebase or DataSnapshot instance and returns an observable (technically a (Writable Computed Observable)[http://knockoutjs.com/documentation/computedObservables.html#writeable_computed_observables]) 
 * that has the value of the priority of this ref and sets the priority on write.
 * 
 * Works by adding an on `child_moved` event to the parent of this node.
 * 
 * Adds an `off` method that unbinds the Firebase `child_moved` event handler and a `_ref` property with the original Firebase ref.
 */
ko.firebase.observablePriority = (function() {
	var observablePriorityFromRef = function(ref, value) {
		var parent = ref.parent();
		var observable = ko.observable(value || null);
		var computed = ko.computed({
			read: observable,
			write: Firebase.prototype.setPriority,
			owner: ref
		});
		var handler = function(snapshot) {
			if(snapshot.name() == ref.name()) {
				observable(snapshot.getPriority());
			}
		};
		parent.on('child_moved', handler);
		computed.off = function() { parent.off('child_moved', handler); };
		computed._ref = ref;
		return computed;
	};

	return function(snapshotOrRef, value) {
		return (snapshotOrRef instanceof Firebase) ? observablePriorityFromRef(snapshotOrRef, value || null) : observablePriorityFromRef(snapshotOrRef.ref(), snapshotOrRef.getPriority());
	};
})();


/**
 * A sorted dictionary-esque data structure that wraps a `ko.observableArray` with write-only methods that implement functionality
 * needed in order to sync with Firebase.
 *
 * Not really intended to be used directly, except that `FirebaseObservableArray.NAME` can be set before this is used to override the
 * default key under which the Firebase name of each entry is stored.
 */
var FirebaseObservableArray = function() {
	var withName = function(name) { return function(entry) { return entry[FirebaseObservableArray.NAME] === name; }; };

	var observableArray = ko.observableArray();
	this.insertAfter = function(name, entry, prev) {
		entry[FirebaseObservableArray.NAME] = name;
		if(prev == null) {
			observableArray.unshift(entry);
		} else {
			var idx = _.findIndex(observableArray(), withName(prev));
			if(idx < 0) {
				observableArray.unshift(entry);
			} else {
				observableArray.splice(idx+1, 0, entry);
			}
		}
	};
	this.removeByName = function(name) {
		return observableArray.remove(withName(name));
	};
	this.moveByName = function(name, prev) {
		_.forEach(this.removeByName(name), function(entry) {
			this.insertAfter(name, entry, prev);
		}, this);
	};

	var computed = ko.computed({
		read: observableArray,
		write: function() { throw 'ko.firebase.observableArray is not writable. Write to the underlying Firebase location instead.'; }
	}).extend({throttle:100});
	this.getObservableArray = function() { return computed; };
};
FirebaseObservableArray.NAME = '.__firebase_name__';


/**
 * Return an observableArray of `ko.firebase.observable` instances.
 * 
 * Adds an `off` method that unbinds the Firebase events and a `_ref` property with the original Firebase ref.
 */
ko.firebase.observableArray = function(ref, create, removed) {
	var firebaseObservableArray = new FirebaseObservableArray();
	var observableArray = firebaseObservableArray.getObservableArray();
	create = _.bind(create || function(snapshot) { return ko.firebase.observable(snapshot.ref(), snapshot.val()); }, observableArray);
	removed = _.bind(removed || function(entry) { if(_.isFunction(entry.off)) entry.off(); }, observableArray);
	var handlers = {
		child_added: function(snapshot, prev) {
			firebaseObservableArray.insertAfter(snapshot.name(), create(snapshot), prev);
		},
		child_removed: function(snapshot) {
			_.forEach(firebaseObservableArray.removeByName(snapshot.name()), removed);
		},
		child_moved: function(snapshot, prev) {
			firebaseObservableArray.moveByName(snapshot.name(), prev);
		}
	};
	_.forEach(handlers, function(handler, eventName) { ref.on(eventName, handler); });
	observableArray.off = function() {
		_.forEach(handlers, function(handler, eventName) {
			ref.off(eventName, handler);
		});
		_.forEach(observableArray(), removed);
		observableArray.removeAll();
	}
	observableArray._ref = ref;
	return observableArray;
};


/**
 * Extend Firebase to generate a KnockoutJS observable bound to the value of this ref.
 * 
 * This probably only makes sense to use on primitive values.
 * 
 * This actually returns a `computed observable` that proxies writes to Firebase.
 */
Firebase.prototype.asObservable = function() {
	return ko.firebase.observable(this);
};


/**
 * Extend Firebase to generate a KnockoutJS observableArray bound to the children of this ref.
 */
Firebase.prototype.asObservableArray = function(create, removed) {
	return ko.firebase.observableArray(this, create, removed);
};


/**
 * Extend Firebase to generate a KnockoutJS observable bound to the priority of the value at this ref.
 */
Firebase.prototype.priorityAsObservable = function() {
	return ko.firebase.observablePriority(this);
};


