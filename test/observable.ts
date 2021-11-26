import test from "ava";
import { Observable } from "../src";
import { microtask } from "./_utility/timing";

test("execution order, immediate deactivate", t => {
	const events: unknown[] = [];

	let value = 0;

	const observable = new Observable((update, computedValue) => {
		t.is(computedValue, 1);

		events.push("activation", value);
		update(value++);
		events.push("activation", value);
		update(value++);
		events.push("activation", value);

		return () => {
			events.push("deactivate", value);
			value = 0;
		};
	}, () => {
		events.push("compute", value);
		return value++;
	}, true);

	events.push("pre");
	t.is(observable.value, 0);

	observable.subscribe(value => {
		events.push("observer", value);
	})();

	t.is(observable.value, 0);
	events.push("post");

	t.deepEqual(events, [
		"pre",
		"compute", 0,
		"compute", 1,
		"observer", 1,
		"activation", 2,
		"observer", 2,
		"activation", 3,
		"observer", 3,
		"activation", 4,
		"deactivate", 4,
		"compute", 0,
		"post",
	]);
});

test("execution order, delayed deactivate", async t => {
	const events: unknown[] = [];

	let value = 0;

	const observable = new Observable((update, computedValue) => {
		t.is(computedValue, 1);

		events.push("activation", value);
		update(value++);
		events.push("activation", value);
		update(value++);
		events.push("activation", value);

		return () => {
			events.push("deactivate", value);
			value = 0;
		};
	}, () => {
		events.push("compute", value);
		return value++;
	});

	events.push("pre");
	t.is(observable.value, 0);

	observable.subscribe(value => {
		events.push("observer", value);
	})();

	t.is(observable.value, 3);
	events.push("unsubscribed");

	await microtask();
	t.is(observable.value, 0);
	events.push("post");

	t.deepEqual(events, [
		"pre",
		"compute", 0,
		"compute", 1,
		"observer", 1,
		"activation", 2,
		"observer", 2,
		"activation", 3,
		"observer", 3,
		"activation", 4,
		"unsubscribed",
		"deactivate", 4,
		"compute", 0,
		"post",
	]);
});

test("execution order, multiple observers, reactivation", async t => {
	const events: unknown[] = [];

	let currentUpdate: (value: number) => void;

	const observable = new Observable<number>((update, computedValue) => {
		events.push("activate", computedValue);
		currentUpdate = update;

		return () => {
			events.push("deactivate");
		};
	}, () => 0);

	events.push("subscribe1");
	const observer1 = observable.subscribe(value => {
		events.push("update1", value);
	});
	events.push("subscribed1");

	currentUpdate!(1);

	events.push("subscribe2");
	const observer2 = observable.subscribe(value => {
		events.push("update2", value);
	}, false);
	events.push("subscribed2");

	currentUpdate!(2);

	events.push("unsubscribe1");
	observer1();
	await microtask();
	events.push("unsubscribed1");

	currentUpdate!(3);

	events.push("unsubscribe2");
	observer2();
	await microtask();
	events.push("unsubscribed2");

	events.push("subscribe3");
	const observer3 = observable.subscribe(value => {
		events.push("update3", value);
	}, false);
	events.push("subscribed3");

	currentUpdate!(4);

	events.push("unsubscribe3");
	observer3();
	await microtask();
	events.push("unsubscribed3");

	t.deepEqual(events, [
		"subscribe1",
		"update1", 0,
		"activate", 0,
		"subscribed1",
		"update1", 1,
		"subscribe2",
		"subscribed2",
		"update1", 2,
		"update2", 2,
		"unsubscribe1",
		"unsubscribed1",
		"update2", 3,
		"unsubscribe2",
		"deactivate",
		"unsubscribed2",
		"subscribe3",
		"activate", 0,
		"subscribed3",
		"update3", 4,
		"unsubscribe3",
		"deactivate",
		"unsubscribed3",
	]);
});
