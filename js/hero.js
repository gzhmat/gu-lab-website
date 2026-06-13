/* =====================================================================
   Gu Lab — hero DNA double-helix
   Custom canvas 2D with hand-rolled 3D projection. No dependencies.
   A rotating double helix of glowing nucleotide nodes with base-pair
   rungs, reacting subtly to the pointer. Falls back to a static frame
   when reduced motion is requested.
===================================================================== */
(function () {
	"use strict";
	const canvas = document.getElementById("hero-canvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	let w, h, dpr, cx, cy;
	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cw = canvas.clientWidth, chh = canvas.clientHeight;
		w = canvas.width = cw * dpr;
		h = canvas.height = chh * dpr;
		canvas.style.width = cw + "px";
		canvas.style.height = chh + "px";
		cx = w * (w > 760 * dpr ? 0.7 : 0.5);  /* push helix right of the copy on wide screens */
		cy = h / 2;
	}

	// Helix geometry
	const N = 46;                 // base pairs
	const RISE = 17;              // vertical spacing between pairs (model units)
	const RADIUS = 92;            // helix radius (model units)
	const TURN = 0.42;            // radians of twist per base pair
	const FOCAL = 560;            // perspective focal length

	// Base-pair colors (A-T, G-C palettes) — deep & saturated to read on a light page
	const PAIRS = [
		["#0d9488", "#0b6a63"],
		["#2563eb", "#1842b8"],
		["#6d28d9", "#4c1d95"],
		["#0891b2", "#075f78"],
		["#be185d", "#831843"],
	];

	let rot = 0;
	let targetTiltX = 0, targetTiltY = 0, tiltX = 0, tiltY = 0;
	let scale = 1; // device-fit scale set per frame

	window.addEventListener(
		"pointermove",
		(e) => {
			const nx = e.clientX / window.innerWidth - 0.5;
			const ny = e.clientY / window.innerHeight - 0.5;
			targetTiltY = nx * 0.5;
			targetTiltX = ny * 0.35;
		},
		{ passive: true }
	);

	function project(x, y, z) {
		// rotate around Y (tiltY) then X (tiltX)
		let cosY = Math.cos(tiltY), sinY = Math.sin(tiltY);
		let x1 = x * cosY - z * sinY;
		let z1 = x * sinY + z * cosY;
		let cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
		let y1 = y * cosX - z1 * sinX;
		let z2 = y * sinX + z1 * cosX;
		const depth = FOCAL / (FOCAL + z2);
		return {
			x: cx + x1 * depth * scale,
			y: cy + y1 * depth * scale,
			d: depth,
			z: z2,
		};
	}

	function dot(p, r, color, alpha) {
		// Solid bead with a soft CAST shadow (not a colored halo), so it reads on light.
		// save/restore isolates the shadow state so it can't leak into later stroke passes.
		ctx.save();
		ctx.beginPath();
		ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.globalAlpha = alpha;
		ctx.shadowColor = "rgba(15,40,64,0.30)";
		ctx.shadowBlur = r * 1.4;
		ctx.shadowOffsetY = 1.5 * dpr;
		ctx.fill();
		ctx.restore();
		// crisp dark edge so the bead separates from the near-white background
		ctx.globalAlpha = Math.min(1, alpha + 0.12);
		ctx.lineWidth = 0.7 * dpr;
		ctx.strokeStyle = "rgba(15,40,64,0.45)";
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	function frame() {
		ctx.clearRect(0, 0, w, h);
		// fit helix to viewport height
		scale = (Math.min(h, w * 1.1) / (N * RISE)) * 1.55 * dpr;

		tiltX += (targetTiltX - tiltX) * 0.05;
		tiltY += (0.6 + targetTiltY - tiltY) * 0.05; // slight default 3/4 view

		const nodes = [];
		const half = (N - 1) / 2;
		for (let i = 0; i < N; i++) {
			const y = (i - half) * RISE;
			const ang = i * TURN + rot;
			const x1 = Math.cos(ang) * RADIUS;
			const z1 = Math.sin(ang) * RADIUS;
			const x2 = Math.cos(ang + Math.PI) * RADIUS;
			const z2 = Math.sin(ang + Math.PI) * RADIUS;
			const pal = PAIRS[i % PAIRS.length];
			nodes.push({
				a: project(x1, y, z1),
				b: project(x2, y, z2),
				pal,
				i,
			});
		}

		// draw rungs first, sorted back-to-front
		const order = nodes.slice().sort((p, q) => (p.a.z + p.b.z) - (q.a.z + q.b.z));
		for (const n of order) {
			const midAlpha = 0.30 * Math.min(n.a.d, n.b.d);
			const grad = ctx.createLinearGradient(n.a.x, n.a.y, n.b.x, n.b.y);
			grad.addColorStop(0, n.pal[0]);
			grad.addColorStop(1, n.pal[1]);
			ctx.strokeStyle = grad;
			ctx.globalAlpha = midAlpha + 0.28;
			ctx.lineWidth = 1.6 * dpr * ((n.a.d + n.b.d) / 2);
			ctx.beginPath();
			ctx.moveTo(n.a.x, n.a.y);
			ctx.lineTo(n.b.x, n.b.y);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		// backbone strands — per-segment, depth-composited so far/near read correctly
		for (const strand of ["a", "b"]) {
			ctx.strokeStyle = strand === "a" ? "rgb(13,118,110)" : "rgb(30,99,235)";
			for (let i = 1; i < nodes.length; i++) {
				const p0 = nodes[i - 1][strand], p1 = nodes[i][strand];
				ctx.globalAlpha = 0.25 + 0.4 * Math.min(p0.d, p1.d);
				ctx.lineWidth = 1.8 * dpr * ((p0.d + p1.d) / 2);
				ctx.beginPath();
				ctx.moveTo(p0.x, p0.y);
				ctx.lineTo(p1.x, p1.y);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;

		// nucleotide nodes (front-most brightest)
		for (const n of order) {
			const ra = (2.6 + n.a.d * 2.4) * dpr;
			const rb = (2.6 + n.b.d * 2.4) * dpr;
			dot(n.a, ra, n.pal[0], 0.7 + n.a.d * 0.3);
			dot(n.b, rb, n.pal[1], 0.7 + n.b.d * 0.3);
		}

		if (!reduce) rot += 0.0045;
		requestAnimationFrame(frame);
	}

	resize();
	window.addEventListener("resize", resize);
	if (reduce) { tiltY = 0.6; frame(); } // single static frame
	else frame();
})();
