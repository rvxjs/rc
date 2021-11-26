
export function microtask() {
	return new Promise<void>(resolve => {
		queueMicrotask(resolve);
	});
}
