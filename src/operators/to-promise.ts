import { Disposable } from "../disposable";
import { ObservableLike } from "../observable";

/** Convert an observable to a promise. */
export function toPromise<T>(source: ObservableLike<T>) {
	return new Promise((resolve, reject) => {
		const subscription = new Disposable();
		subscription.add(source.subscribe({
			resolve(value) {
				subscription.dispose();
				resolve(value);
			},
			reject(error) {
				subscription.dispose();
				reject(error);
			}
		}));
		return subscription;
	});
}
