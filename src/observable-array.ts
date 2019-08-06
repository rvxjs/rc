import { Sequence, SequenceObserver, SequenceRange, Unit } from "./sequence";

const RANGE = Symbol("range");
const PROJECTION = Symbol("projection");
const TARGET = Symbol("target");

export class ObservableArray<T> extends Sequence<T> implements Array<T> {
	public constructor(proxy = true) {
		super();
		if (proxy) {
			return new Proxy(this[TARGET], {
				get: (_, prop) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.get(this, prop);
					} else {
						return this.get(index);
					}
				},
				set: (_, prop, value) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.set(this, prop, value);
					} else {
						this.set(index, value);
						return true;
					}
				},
				deleteProperty: (_, prop) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.deleteProperty(this, prop);
					} else {
						this.delete(index);
						return true;
					}
				},
				has: (_, prop) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.has(this, prop);
					} else {
						return this.has(index);
					}
				}
			}) as this;
		}
	}

	private readonly [RANGE]: SequenceRange<T> = { next: null, prev: null };
	private readonly [PROJECTION]: Unit<T>[] = [];
	private readonly [TARGET]: T[] = [];

	protected onSubscribe(observer: Partial<SequenceObserver<T>>) {
		if (observer.updateSequence) {
			observer.updateSequence({ prev: null, next: null, stale: null, fresh: this[RANGE].next ? this[RANGE] : null });
		}
	}

	[n: number]: T;

	public get length() {
		return this[TARGET].length;
	}

	public set length(value: number) {
		value = Math.max(0, value);
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const oldLength = target.length;
		if (value > oldLength) {
			for (let i = oldLength; i < value; i++) {
				const prev = projection[i - 1];
				(prev || range).next = projection[i] = { prev, next: null, value: undefined };
			}
			range.prev = projection[value - 1];
			target.length = value;
			this.notifyUpdateSequence({ prev: projection[oldLength - 1], next: null, stale: null, fresh: { next: projection[oldLength], prev: projection[value - 1] } });
		} else {
			const stale: SequenceRange<T> = { next: projection[value], prev: projection[oldLength - 1] };
			const prev = projection[value - 1];
			if (prev) {
				prev.next = null;
				range.prev = prev;
			}
			projection.length = value;
			target.length = value;
			this.notifyUpdateSequence({ prev, next: null, stale, fresh: null });
		}
	}

	public get(index: number) {
		return this[TARGET][index];
	}

	public set(index: number, value: T) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const oldLength = target.length;

		if (index < oldLength) {
			const oldUnit = projection[index];
			const unit: Unit<T> = { prev: oldUnit.prev, next: oldUnit.next, value };
			(oldUnit.prev || range).next = unit;
			(oldUnit.next || range).prev = unit;
			projection[index] = unit;
			target[index] = value;
			this.notifyUpdateSequence({ prev: oldUnit.prev, next: oldUnit.next, stale: { next: oldUnit, prev: oldUnit }, fresh: { next: unit, prev: unit } });
		} else {
			for (let i = oldLength; i < index; i++) {
				const prev = projection[i - 1];
				(prev || range).next = projection[i] = { prev, next: null, value: undefined };
			}
			const prev = projection[index - 1];
			range.prev = (prev || range).next = projection[index] = { prev, next: null, value };
			target[index] = value;
			this.notifyUpdateSequence({ prev: projection[oldLength - 1], next: null, stale: null, fresh: { next: projection[oldLength], prev: projection[index] } });
		}
	}

	public delete(index: number) {
		const target = this[TARGET];
		if (index in target) {
			const range = this[RANGE];
			const projection = this[PROJECTION];
			const oldUnit = projection[index];
			const unit: Unit<T> = { prev: oldUnit.prev, next: oldUnit.next, value: undefined };
			(oldUnit.prev || range).next = unit;
			(oldUnit.next || range).prev = unit;
			projection[index] = unit;
			delete this[TARGET][index];
			this.notifyUpdateSequence({ prev: oldUnit.prev, next: oldUnit.next, stale: { next: oldUnit, prev: oldUnit }, fresh: { next: unit, prev: unit } });
		}
	}

	public has(index: number) {
		return index in this[TARGET];
	}

	public toString() {
		return this[TARGET].toString();
	}

	public toLocaleString(locales?: any, options?: any) {
		return (this[TARGET] as any).toLocaleString(locales, options);
	}

	public pop() {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const unit = projection.pop();
		if (unit) {
			const prev = unit.prev;
			range.prev = prev;
			(prev || range).next = null;
			const value = target.pop();
			this.notifyUpdateSequence({ prev, next: null, stale: { next: unit, prev: unit }, fresh: null });
			return value;
		}
	}

	public push(...items: T[]) {
		const target = this[TARGET];
		if (items.length > 0) {
			const range = this[RANGE];
			const projection = this[PROJECTION];
			const oldLength = target.length;
			let prev = projection[oldLength - 1];
			for (const value of items) {
				const unit: Unit<T> = { prev, next: null, value };
				projection.push((prev || range).next = unit);
				prev = unit;
			}
			range.prev = prev;
			this[TARGET].push(...items);
			this.notifyUpdateSequence({ prev: projection[oldLength - 1], next: null, stale: null, fresh: { next: projection[oldLength], prev } });
		}
		return target.length;
	}

	public concat(...items: (T | ConcatArray<T>)[]): T[];
	public concat(...items: any[]) {
		return this[TARGET].concat(...items);
	}

	public join(separator?: string): string {
		return this[TARGET].join(separator);
	}

	public reverse() {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		if (target.length) {
			target.reverse();
			const stale: SequenceRange<T> = { next: projection[0], prev: projection[target.length - 1] };
			let prev: Unit<T>;
			for (const value of target) {
				const unit: Unit<T> = { prev, next: null, value };
				(prev || range).next = unit;
				prev = unit;
			}
			range.prev = prev;
			this.notifyUpdateSequence({ prev: null, next: null, stale, fresh: range });
		}
		return this;
	}

	public shift(): T {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const unit = projection.shift();
		if (unit) {
			const next = unit.next;
			range.next = next;
			(next || range).prev = null;
			const value = target.shift();
			this.notifyUpdateSequence({ prev: null, next, stale: { next: unit, prev: unit }, fresh: null });
			return value;
		}
	}

	public slice(start?: number, end?: number): T[] {
		return this[TARGET].slice(start, end);
	}

	/**
	 * Sort the array.
	 *
	 * **WARNING**: Currently, sorting an observable array will emit a patch that replaces the complete old array with the sorted array, even if nothing changes. Consider using a sort operator instead.
	 */
	public sort(compareFn?: (a: T, b: T) => number) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		if (target.length) {
			target.sort(compareFn);
			const stale: SequenceRange<T> = { next: projection[0], prev: projection[target.length - 1] };
			let prev: Unit<T>;
			for (const value of target) {
				const unit: Unit<T> = { prev, next: null, value };
				(prev || range).next = unit;
				prev = unit;
			}
			range.prev = prev;
			this.notifyUpdateSequence({ prev: null, next: null, stale, fresh: range });
		}
		return this;
	}

	public splice(start: number, deleteCount?: number, ...items: T[]): T[] {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const oldLength = target.length;
		start >>= 0;
		if (start > oldLength) {
			start = oldLength;
		} else if (start < -oldLength) {
			start = 0;
		} else if (start < 0) {
			start = oldLength + start;
		}
		if (deleteCount === undefined || deleteCount > oldLength - start) {
			deleteCount = oldLength - start;
		} else if (deleteCount < 0) {
			deleteCount = 0;
		} else {
			deleteCount >>= 0;
		}
		let prev = projection[start - 1];
		const fresh: Unit<T>[] = [];
		for (const value of items) {
			const unit: Unit<T> = { prev, next: null, value };
			(prev || range).next = unit;
			prev = unit;
			fresh.push(unit);
		}
		const next = projection[start + deleteCount];
		(prev || range).next = next;
		(next || range).prev = prev;
		const stale = projection.splice(start, deleteCount, ...fresh);
		const result = target.splice(start, deleteCount, ...items);
		this.notifyUpdateSequence({
			prev: projection[start - 1],
			next,
			stale: deleteCount > 0 ? { next: stale[0], prev: stale[deleteCount - 1] } : null,
			fresh: items.length > 0 ? { next: fresh[0], prev: fresh[items.length - 1] } : null
		});
		return result;
	}

	public unshift(...items: T[]): number {
		const target = this[TARGET];
		if (items.length > 0) {
			const range = this[RANGE];
			const projection = this[PROJECTION];
			let prev: Unit<T> = null;
			const fresh: Unit<T>[] = [];
			for (const value of items) {
				const unit: Unit<T> = { prev, next: null, value };
				(prev || range).next = unit;
				prev = unit;
				fresh.push(unit);
			}
			const next = projection[0];
			prev.next = next;
			(next || range).prev = prev;
			projection.unshift(...fresh);
			target.unshift(...items);
			this.notifyUpdateSequence({ prev: null, next, stale: null, fresh: { next: fresh[0], prev: fresh[items.length - 1] }
			});
		}
		return target.length;
	}

	public indexOf(item: T, fromIndex?: number): number {
		return this[TARGET].indexOf(item, fromIndex);
	}

	public lastIndexOf(item: T, fromIndex?: number): number {
		return this[TARGET].lastIndexOf(item, fromIndex);
	}

	public every(callbackfn: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
		return this[TARGET].every(callbackfn, thisArg);
	}

	public some(callbackfn: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
		return this[TARGET].some(callbackfn, thisArg);
	}

	public forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
		return this[TARGET].forEach(callbackfn, thisArg);
	}

	public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
		return this[TARGET].map(callbackfn, thisArg);
	}

	public filter<S extends T>(callbackfn: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
	public filter(callbackfn: (value: T, index: number, array: T[]) => any, thisArg?: any): T[];
	public filter(callbackfn: any, thisArg?: any) {
		return this[TARGET].filter(callbackfn, thisArg);
	}

	public reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;
	public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
	public reduce(callbackfn: any, initialValue?: any) {
		return this[TARGET].reduce(callbackfn, initialValue);
	}

	public reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;
	public reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
	public reduceRight(callbackfn: any, initialValue?: any) {
		return this[TARGET].reduceRight(callbackfn, initialValue);
	}

	public find<S extends T>(predicate: (this: void, value: T, index: number, obj: T[]) => value is S, thisArg?: any): S;
	public find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T;
	public find(predicate: any, thisArg?: any) {
		return this[TARGET].find(predicate, thisArg);
	}

	public findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number {
		return this[TARGET].findIndex(predicate, thisArg);
	}

	public fill(value: T, start?: number, end?: number) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const length = target.length;
		if (start === undefined || start < -length) {
			start = 0;
		} else if (start > length) {
			return this;
		} else if (start < 0) {
			start = length + start;
		} else {
			start >>= 0;
		}
		if (end === undefined || end > length) {
			end = length;
		} else if (end < 0) {
			end = length + end;
		} else {
			end >>= 0;
		}
		if (end <= start) {
			return this;
		}
		end = Math.min(end);

		let prev = projection[start - 1];
		const fresh: Unit<T>[] = [];
		for (let i = start; i < end; i++) {
			const unit: Unit<T> = { prev, next: null, value };
			(prev || range).next = unit;
			prev = unit;
			fresh.push(unit);
		}
		const next = projection[end];
		(prev || range).next = next;
		(next || range).prev = prev;
		const stale = projection.splice(start, end - start, ...fresh);
		target.fill(value, start, end);
		this.notifyUpdateSequence({
			prev: projection[start - 1],
			next,
			stale: { next: stale[0], prev: stale[stale.length - 1] },
			fresh: { next: fresh[0], prev: fresh[fresh.length - 1] }
		});
		return this;
	}

	public copyWithin(targetStart: number, start?: number, end?: number): this {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const length = target.length;

		if (targetStart < -length) {
			targetStart = 0;
		} else if (targetStart < 0) {
			targetStart = length + targetStart;
		} else {
			targetStart >>= 0;
		}
		if (start < -length) {
			start = 0;
		} else if (start < 0) {
			start = length + start;
		} else {
			start >>= 0;
		}
		if (end === undefined) {
			end = length;
		} else if (end < 0) {
			end = length + end;
		} else {
			end >>= 0;
		}
		if (targetStart >= length || end <= start) {
			return this;
		}
		const targetEnd = Math.min(targetStart + (end - start), length);
		const offset = start - targetStart;
		const stale: SequenceRange<T> = { next: projection[targetStart], prev: projection[targetEnd - 1] };
		let prev = projection[targetStart - 1];
		for (let i = targetStart; i < targetEnd; i++) {
			const unit: Unit<T> = { prev, next: null, value: target[i + offset] };
			(prev || range).next = unit;
			prev = unit;
			projection[i] = unit;
		}
		prev.next = projection[targetEnd];
		(projection[targetEnd] || range).prev = prev;
		target.copyWithin(targetStart, start, end);
		this.notifyUpdateSequence({ prev: projection[targetStart - 1], next: projection[targetEnd], stale, fresh: { next: projection[targetStart], prev: projection[targetEnd - 1] } });
		return this;
	}

	public [Symbol.iterator](): IterableIterator<T> {
		return this[TARGET][Symbol.iterator]();
	}

	public entries(): IterableIterator<[number, T]> {
		return this[TARGET].entries();
	}

	public keys(): IterableIterator<number> {
		return this[TARGET].keys();
	}

	public values(): IterableIterator<T> {
		return this[TARGET].values();
	}

	public [Symbol.unscopables](): any {
		return this[TARGET][Symbol.unscopables]();
	}

	public includes(searchElement: T, fromIndex?: number): boolean {
		return this[TARGET].includes(searchElement, fromIndex);
	}

	public static [Symbol.hasInstance](value: any) {
		return value && (TARGET in value);
	}
}

function parseIndex(value: string | number | symbol) {
	if (typeof value === "symbol") {
		return null;
	}
	const index = Number(value);
	return (index | 0) === index && index >= 0 ? index : null;
}
