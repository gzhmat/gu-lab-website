/* =====================================================================
   Gu Lab — shared site interactions
   Vanilla JS, no dependencies. Loaded on every page (defer).
   Honors prefers-reduced-motion throughout.
===================================================================== */
(function () {
	"use strict";
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
	const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

	/* ---------- Header: shrink on scroll + scroll progress ---------- */
	const header = document.querySelector(".site-header");
	const progress = document.getElementById("scroll-progress");
	function onScroll() {
		const y = window.scrollY || document.documentElement.scrollTop;
		if (header) header.classList.toggle("scrolled", y > 24);
		if (progress) {
			const h = document.documentElement.scrollHeight - window.innerHeight;
			progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
		}
	}
	on(window, "scroll", onScroll, { passive: true });
	onScroll();

	/* ---------- Mobile nav ---------- */
	const toggle = document.querySelector(".nav-toggle");
	const nav = document.getElementById("primary-nav");
	if (toggle && nav) {
		on(toggle, "click", () => {
			const open = nav.classList.toggle("open");
			toggle.classList.toggle("open", open);
			toggle.setAttribute("aria-expanded", open ? "true" : "false");
		});
		nav.querySelectorAll("a").forEach((a) =>
			on(a, "click", () => {
				nav.classList.remove("open");
				toggle.classList.remove("open");
			})
		);
	}

	/* ---------- Scroll reveal ---------- */
	const reveals = document.querySelectorAll("[data-reveal]");
	if (reveals.length) {
		if (reduce || !("IntersectionObserver" in window)) {
			reveals.forEach((el) => el.classList.add("in"));
		} else {
			const io = new IntersectionObserver(
				(entries) => {
					entries.forEach((e) => {
						if (e.isIntersecting) {
							e.target.classList.add("in");
							io.unobserve(e.target);
						}
					});
				},
				{ threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
			);
			reveals.forEach((el) => io.observe(el));
		}
	}

	/* ---------- Animated counters ---------- */
	const counters = document.querySelectorAll("[data-count]");
	function runCount(el) {
		const target = parseFloat(el.getAttribute("data-count"));
		const suffix = el.getAttribute("data-suffix") || "";
		const dur = 1500;
		if (reduce) { el.textContent = target + suffix; return; }
		const start = performance.now();
		function step(now) {
			const p = Math.min((now - start) / dur, 1);
			const eased = 1 - Math.pow(1 - p, 3);
			el.textContent = Math.round(target * eased) + suffix;
			if (p < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}
	if (counters.length) {
		const cio = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
				});
			},
			{ threshold: 0.6 }
		);
		counters.forEach((el) => cio.observe(el));
	}

	/* ---------- Card spotlight (mouse-tracked glow) ---------- */
	if (fine) {
		document.querySelectorAll(".card").forEach((card) => {
			on(card, "pointermove", (e) => {
				const r = card.getBoundingClientRect();
				card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
				card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
			});
		});

		/* ---------- 3D tilt ---------- */
		document.querySelectorAll("[data-tilt]").forEach((el) => {
			const max = 8;
			on(el, "pointermove", (e) => {
				const r = el.getBoundingClientRect();
				const px = (e.clientX - r.left) / r.width - 0.5;
				const py = (e.clientY - r.top) / r.height - 0.5;
				el.style.transform = `perspective(800px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateY(-4px)`;
			});
			on(el, "pointerleave", () => { el.style.transform = ""; });
		});
	}

	/* ---------- Custom cursor + magnetic buttons ---------- */
	if (fine && !reduce) {
		const dot = document.createElement("div");
		const ring = document.createElement("div");
		dot.className = "cursor-dot";
		ring.className = "cursor-ring";
		document.body.append(dot, ring);
		let rx = 0, ry = 0, dx = 0, dy = 0;
		on(window, "pointermove", (e) => {
			dx = e.clientX; dy = e.clientY;
			dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
		});
		(function loop() {
			rx += (dx - rx) * 0.18; ry += (dy - ry) * 0.18;
			ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
			requestAnimationFrame(loop);
		})();
		document.querySelectorAll("a, button, .btn, [data-tilt], .member-card").forEach((el) => {
			on(el, "pointerenter", () => ring.classList.add("is-hover"));
			on(el, "pointerleave", () => ring.classList.remove("is-hover"));
		});
		document.querySelectorAll("[data-magnetic]").forEach((el) => {
			on(el, "pointermove", (e) => {
				const r = el.getBoundingClientRect();
				el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
			});
			on(el, "pointerleave", () => { el.style.transform = ""; });
		});
	}

	/* ---------- Text scramble (decode) effect ---------- */
	function Scramble(el) {
		const chars = "!<>-_\\/[]{}—=+*^?#01ACGT";
		let frame = 0, queue = [], raf;
		const setText = (newText) =>
			new Promise((resolve) => {
				const old = el.textContent;
				const len = Math.max(old.length, newText.length);
				queue = [];
				for (let i = 0; i < len; i++) {
					const from = old[i] || "";
					const to = newText[i] || "";
					const start = Math.floor(Math.random() * 40);
					const end = start + Math.floor(Math.random() * 40);
					queue.push({ from, to, start, end, char: "" });
				}
				cancelAnimationFrame(raf);
				frame = 0;
				update(resolve);
			});
		function update(resolve) {
			let out = "", done = 0;
			for (const q of queue) {
				if (frame >= q.end) { done++; out += q.to; }
				else if (frame >= q.start) {
					if (!q.char || Math.random() < 0.28) q.char = chars[Math.floor(Math.random() * chars.length)];
					out += `<span class="dim">${q.char}</span>`;
				} else out += q.from;
			}
			el.innerHTML = out;
			if (done === queue.length) resolve();
			else { frame++; raf = requestAnimationFrame(() => update(resolve)); }
		}
		return { setText };
	}
	document.querySelectorAll("[data-scramble]").forEach((el) => {
		const phrases = (el.getAttribute("data-scramble") || el.textContent).split("|").map((s) => s.trim());
		if (reduce) { el.textContent = phrases[0]; return; }
		const s = Scramble(el);
		let i = 0;
		(function cycle() {
			s.setText(phrases[i]).then(() => {
				i = (i + 1) % phrases.length;
				setTimeout(cycle, phrases.length > 1 ? 2200 : 1e9);
			});
		})();
	});

	/* ---------- Scroll-spy nav (sections with id) ---------- */
	const spy = document.querySelectorAll("nav [data-spy]");
	if (spy.length) {
		const sections = [...spy].map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
		const sio = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) {
						const id = "#" + e.target.id;
						spy.forEach((a) => a.parentElement.classList.toggle("active", a.getAttribute("href") === id));
					}
				});
			},
			{ threshold: 0.4 }
		);
		sections.forEach((s) => sio.observe(s));
	}

	/* ---------- Background particle network (all pages) ---------- */
	const canvas = document.getElementById("bg-particles");
	if (canvas && !reduce) {
		const ctx = canvas.getContext("2d");
		let w, h, dpr, pts = [], mouse = { x: -999, y: -999 };
		function resize() {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = canvas.width = innerWidth * dpr;
			h = canvas.height = innerHeight * dpr;
			canvas.style.width = innerWidth + "px";
			canvas.style.height = innerHeight + "px";
			const count = Math.min(90, Math.floor((innerWidth * innerHeight) / 22000));
			pts = Array.from({ length: count }, () => ({
				x: Math.random() * w,
				y: Math.random() * h,
				vx: (Math.random() - 0.5) * 0.18 * dpr,
				vy: (Math.random() - 0.5) * 0.18 * dpr,
				r: (Math.random() * 1.4 + 0.6) * dpr,
			}));
		}
		on(window, "pointermove", (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; }, { passive: true });
		on(window, "pointerleave", () => { mouse.x = mouse.y = -9999; });
		const LINK = 130, LINK2 = LINK * LINK;
		function draw() {
			ctx.clearRect(0, 0, w, h);
			for (const p of pts) {
				p.x += p.vx; p.y += p.vy;
				if (p.x < 0 || p.x > w) p.vx *= -1;
				if (p.y < 0 || p.y > h) p.vy *= -1;
				const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
				if (mdx * mdx + mdy * mdy < (160 * dpr) ** 2) {
					const d = Math.hypot(mdx, mdy) || 1;
					p.x += (mdx / d) * 0.6; p.y += (mdy / d) * 0.6;
				}
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(30,80,95,0.42)";
				ctx.fill();
			}
			const link = LINK2 * dpr * dpr;
			for (let i = 0; i < pts.length; i++) {
				for (let j = i + 1; j < pts.length; j++) {
					const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
					const d2 = dx * dx + dy * dy;
					if (d2 < link) {
						const a = (1 - d2 / link) * 0.32;
						ctx.strokeStyle = `rgba(13,90,110,${a})`;
						ctx.lineWidth = dpr * 0.7;
						ctx.beginPath();
						ctx.moveTo(pts[i].x, pts[i].y);
						ctx.lineTo(pts[j].x, pts[j].y);
						ctx.stroke();
					}
				}
			}
			requestAnimationFrame(draw);
		}
		resize();
		on(window, "resize", resize);
		draw();
	}

	/* ---------- Footer year ---------- */
	const yr = document.getElementById("year");
	if (yr) yr.textContent = new Date().getFullYear();
})();
