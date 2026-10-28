import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export function popover(
	_node: Element,
	{ y = -10, origin = 'top center' }: { y?: number; origin?: string } = {}
): TransitionConfig {
	return {
		duration: 200,
		easing: cubicOut,
		css: (t) =>
			`opacity: ${t}; transform-origin: ${origin}; transform: translateY(${(1 - t) * y}px) scale(${0.9 + 0.1 * t});`
	};
}

export function modalBackdrop(_node: Element): TransitionConfig {
	return {
		duration: 200,
		easing: cubicOut,
		css: (t) => `opacity: ${t}; backdrop-filter: blur(${20 * t}px);`
	};
}

export function modalWindow(_node: Element): TransitionConfig {
	return {
		duration: 200,
		easing: cubicOut,
		css: (t) =>
			`opacity: ${t}; transform: scale(${0.7 + 0.3 * t}) rotateX(${25 * (1 - t)}deg) translateY(${30 * (1 - t)}px);`
	};
}

export function stackEnter(
	_node: Element,
	{ direction = 1 }: { direction?: number } = {}
): TransitionConfig {
	return {
		duration: 300,
		easing: cubicOut,
		css: (t) => `opacity: ${t}; transform: translateX(${direction * 30 * (1 - t)}%);`
	};
}

export function stackExit(node: Element): TransitionConfig {
	const direction = Number((node as HTMLElement).dataset.direction || 1);
	return {
		duration: 300,
		easing: cubicOut,
		css: (t) => `opacity: ${t}; transform: translateX(${-direction * 30 * (1 - t)}%);`
	};
}
