import React, { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { create } from "zustand";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowRight, Calendar, Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Compass, Eye, Gamepad2, Globe, MapPin, Minus, Orbit, Plus, Rocket, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, Sun, Sunrise, Sunset, Thermometer, Volume2, X } from "lucide-react";
import * as Astronomy from "astronomy-engine";
import { degreesLat, degreesLong, eciToGeodetic, gstime, propagate, twoline2satrec } from "satellite.js";
import * as SunCalc from "suncalc";
// src/state/useFocusStore.ts
var useFocusStore = create((set) => ({
	selectedId: "earth",
	hoveredId: null,
	activeTarget: {
		id: "earth",
		name: "Earth",
		radius: 2.2,
		type: "planet"
	},
	selectBody: (target) => set({
		selectedId: target ? target.id : null,
		activeTarget: target
	}),
	hoverBody: (id) => set({ hoveredId: id }),
	clearSelection: () => set({
		selectedId: null,
		activeTarget: null
	})
}));
// src/utils/spaceshipAudio.ts
/**
* Procedural Web Audio API sound synthesizer for KidStar spaceship.
* Generates futuristic warp drive engine whoosh and arrival chimes without external audio assets.
*/
var SpaceshipAudio = class {
	ctx = null;
	initCtx() {
		if (!this.ctx && typeof window !== "undefined") {
			const AudioCtx = window.AudioContext || window.webkitAudioContext;
			if (AudioCtx) this.ctx = new AudioCtx();
		}
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	playWarpEngage() {
		try {
			this.initCtx();
			if (!this.ctx) return;
			const now = this.ctx.currentTime;
			const osc1 = this.ctx.createOscillator();
			const osc2 = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			const filter = this.ctx.createBiquadFilter();
			osc1.type = "sawtooth";
			osc1.frequency.setValueAtTime(65, now);
			osc1.frequency.exponentialRampToValueAtTime(260, now + 1.2);
			osc2.type = "triangle";
			osc2.frequency.setValueAtTime(130, now);
			osc2.frequency.exponentialRampToValueAtTime(520, now + 1.4);
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(240, now);
			filter.frequency.exponentialRampToValueAtTime(1200, now + 1.2);
			filter.Q.setValueAtTime(3, now);
			gain.gain.setValueAtTime(.001, now);
			gain.gain.linearRampToValueAtTime(.09, now + .35);
			gain.gain.exponentialRampToValueAtTime(.001, now + 2.2);
			osc1.connect(filter);
			osc2.connect(filter);
			filter.connect(gain);
			gain.connect(this.ctx.destination);
			osc1.start(now);
			osc2.start(now);
			osc1.stop(now + 2.3);
			osc2.stop(now + 2.3);
		} catch {}
	}
	playArrivalChime() {
		try {
			this.initCtx();
			if (!this.ctx) return;
			const now = this.ctx.currentTime;
			[659.25, 830.61].forEach((freq, idx) => {
				if (!this.ctx) return;
				const osc = this.ctx.createOscillator();
				const gain = this.ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, now + idx * .15);
				gain.gain.setValueAtTime(.001, now + idx * .15);
				gain.gain.linearRampToValueAtTime(.07, now + idx * .15 + .04);
				gain.gain.exponentialRampToValueAtTime(1e-4, now + idx * .15 + .85);
				osc.connect(gain);
				gain.connect(this.ctx.destination);
				osc.start(now + idx * .15);
				osc.stop(now + idx * .15 + .9);
			});
		} catch {}
	}
};
var spaceshipAudio = new SpaceshipAudio();
// src/state/useSpaceshipStore.ts
var useSpaceshipStore = create((set) => ({
	isFlying: false,
	destinationName: "",
	destinationColor: "#38bdf8",
	progress: 0,
	arrivalNotice: null,
	startFlight: (destinationName, destinationColor) => {
		spaceshipAudio.playWarpEngage();
		set({
			isFlying: true,
			destinationName,
			destinationColor,
			progress: 0,
			arrivalNotice: null
		});
	},
	updateProgress: (progress) => set({ progress }),
	endFlight: () => {
		spaceshipAudio.playArrivalChime();
		set((state) => ({
			isFlying: false,
			arrivalNotice: `Orbit insertion complete at ${state.destinationName}!`,
			progress: 1
		}));
		setTimeout(() => {
			set({ arrivalNotice: null });
		}, 3200);
	}
}));
// src/state/useTourStore.ts
var useTourStore = create((set) => ({
	isOpen: false,
	startTour: () => set({ isOpen: true }),
	closeTour: () => set({ isOpen: false })
}));
// src/state/useTutorialStore.ts
var useTutorialStore = create((set) => ({
	isOpen: typeof window !== "undefined" ? !localStorage.getItem("kidstar_tutorial_seen_v1") : false,
	activeSlide: 0,
	openTutorial: (slideIndex = 0) => set({
		isOpen: true,
		activeSlide: slideIndex
	}),
	closeTutorial: () => {
		if (typeof window !== "undefined") localStorage.setItem("kidstar_tutorial_seen_v1", "true");
		set({ isOpen: false });
	},
	nextSlide: () => set((state) => ({ activeSlide: Math.min(state.activeSlide + 1, 4) })),
	prevSlide: () => set((state) => ({ activeSlide: Math.max(state.activeSlide - 1, 0) })),
	setSlide: (index) => set({ activeSlide: index })
}));
// src/science/constants.ts
var PLANETARY_METADATA = {
	sun: {
		id: "sun",
		name: "Sun",
		phonetic: "SUHN",
		colorHex: "#FDB813",
		massKg: 19885e26,
		radiusKm: 696340,
		earthRadiusRatio: 109.3,
		axialTiltDeg: 7.25,
		rotationPeriodHours: 609.12,
		orbitalPeriodDays: 0,
		meanDistanceAu: 0,
		temperatureKid: "Extremely Hot! (5,500 °C on the surface)",
		funFact: "The Sun contains 99.86% of all the mass in our entire Solar System! Over 1.3 million Earths could fit inside.",
		funFacts: [
			"The Sun contains 99.86% of all the mass in our entire Solar System! Over 1.3 million Earths could fit inside.",
			"Light from the Sun travels at 300,000 km/s and takes about 8 minutes and 20 seconds to reach Earth.",
			"The core of the Sun reaches a blazing 15,000,000 °C, fusing 600 million tons of hydrogen into helium every single second!",
			"Sunspots are cooler, darker patches caused by magnetic storms, and some can be many times larger than planet Earth.",
			"The Sun produces solar wind—a stream of charged particles that interacts with Earth’s magnetic field to create the Northern and Southern Lights (Auroras)!",
			"The Sun orbits the center of the Milky Way galaxy at 720,000 km/h, taking about 230 million years to make one full cosmic lap."
		]
	},
	mercury: {
		id: "mercury",
		name: "Mercury",
		phonetic: "MYUR-kyuh-ree",
		colorHex: "#A5A5A5",
		massKg: 33011e19,
		radiusKm: 2439.7,
		earthRadiusRatio: .38,
		axialTiltDeg: .034,
		rotationPeriodHours: 1407.6,
		orbitalPeriodDays: 87.97,
		meanDistanceAu: .387,
		temperatureKid: "Freezing nights (-180 °C) and scorching days (430 °C)",
		funFact: "A year on Mercury is only 88 days long, but a single day lasts almost two months!",
		funFacts: [
			"A year on Mercury is only 88 Earth days long, but a single solar day (sunrise to sunrise) lasts 176 Earth days—twice as long as its year!",
			"Because Mercury has virtually no atmosphere to trap heat or scatter light, its daytime sky is pitch black and temperatures swing by 610 °C!",
			"Even though Mercury is closest to the Sun, radar mapping discovered water ice permanently frozen inside deep, shadowed polar craters.",
			"Mercury is slowly shrinking! As its massive iron core cooled over billions of years, its rocky crust wrinkled into giant cliffs kilometers high.",
			"The Caloris Basin is an enormous impact crater 1,550 km across—so violent that seismic shockwaves created chaotic hills on the opposite side of the planet.",
			"If you stood on Mercury, the Sun would appear more than three times bigger in the sky than it does from your backyard on Earth!"
		]
	},
	venus: {
		id: "venus",
		name: "Venus",
		phonetic: "VEE-nuhs",
		colorHex: "#E3BB7B",
		massKg: 48675e20,
		radiusKm: 6051.8,
		earthRadiusRatio: .95,
		axialTiltDeg: 177.36,
		rotationPeriodHours: -5832.5,
		orbitalPeriodDays: 224.7,
		meanDistanceAu: .723,
		temperatureKid: "Super hot! (465 °C, hot enough to melt lead)",
		funFact: "Venus spins backwards compared to most planets, and its thick clouds trap heat like a giant greenhouse!",
		funFacts: [
			"Venus is the hottest planet in the Solar System at 465 °C (870 °F)—hot enough to easily melt lead, tin, and zinc!",
			"Venus rotates backwards (retrograde rotation), which means the Sun rises in the west and sets in the east!",
			"A day on Venus (243 Earth days) is longer than its entire year (225 Earth days)!",
			"The surface air pressure on Venus is 92 times greater than Earth’s—equivalent to being crushed nearly 1 kilometer deep under an ocean.",
			"Venus is wrapped in thick clouds of corrosive sulfuric acid droplets that completely conceal thousands of ancient volcanoes below.",
			"Venus shines as the brightest natural object in the night sky after the Moon, earning it the nicknames \"Morning Star\" and \"Evening Star\"."
		]
	},
	earth: {
		id: "earth",
		name: "Earth",
		phonetic: "URTH",
		colorHex: "#4B9CD3",
		massKg: 597237e19,
		radiusKm: 6371,
		earthRadiusRatio: 1,
		axialTiltDeg: 23.44,
		rotationPeriodHours: 23.934,
		orbitalPeriodDays: 365.256,
		meanDistanceAu: 1,
		temperatureKid: "Just right! (Average 15 °C)",
		funFact: "Earth is the only place in the universe known to have oceans of liquid water and living creatures!",
		funFacts: [
			"Earth is the only place in the known universe confirmed to support life, with liquid oceans covering over 70% of our blue planet!",
			"Earth’s molten nickel-iron outer core acts as a giant dynamo, generating a powerful magnetic field that shields us from deadly solar radiation.",
			"Our atmosphere has a perfect Goldilocks balance: 78% nitrogen, 21% oxygen, and 1% trace gases for comfortable breathing and cloud formation.",
			"Earth is not a perfect sphere: spinning at 1,670 km/h at the equator causes it to gently bulge into an \"oblate spheroid\".",
			"Continental drift moves Earth’s tectonic plates across the globe at roughly the same rate your fingernails grow (2 to 5 centimeters per year)!",
			"Earth has one natural satellite—the Moon—which stabilizes our axial tilt at 23.4° and prevents wild, chaotic climate shifts.",
			"The Amazon Basin produces around 20% of Earth’s land-based oxygen and shelters millions of plant, animal, and insect species."
		]
	},
	mars: {
		id: "mars",
		name: "Mars",
		phonetic: "MAHRZ",
		colorHex: "#CC5533",
		massKg: 64171e19,
		radiusKm: 3389.5,
		earthRadiusRatio: .53,
		axialTiltDeg: 25.19,
		rotationPeriodHours: 24.623,
		orbitalPeriodDays: 686.98,
		meanDistanceAu: 1.524,
		temperatureKid: "Very chilly! (Average -60 °C)",
		funFact: "Mars looks red because its soil is full of iron oxide — rust! It also has the tallest volcano in the solar system, Olympus Mons.",
		funFacts: [
			"Mars looks reddish-orange because its soil is rich in iron oxide—the very same chemical compound that makes rust on old metal!",
			"Mars is home to Olympus Mons, the largest volcano in the Solar System: three times the height of Mount Everest and broad enough to cover all of France!",
			"Valles Marineris is an immense canyon system over 4,000 km long and 7 km deep—four times deeper and ten times longer than the Grand Canyon!",
			"A Martian day is called a \"sol\" and lasts 24 hours, 39 minutes, and 35 seconds—almost identical to an Earth day.",
			"Mars has two tiny, potato-shaped moons named Phobos and Deimos, named after the mythical attendants of the god of war.",
			"NASA rovers have found ancient riverbeds, rounded river pebbles, and lake sediments, proving Mars once had lakes and running rivers billions of years ago!",
			"Mars has sparkling polar ice caps made of water ice and dry ice (frozen carbon dioxide) that grow and melt with the Martian seasons."
		]
	},
	jupiter: {
		id: "jupiter",
		name: "Jupiter",
		phonetic: "JOO-pih-tur",
		colorHex: "#D9A066",
		massKg: 18982e23,
		radiusKm: 69911,
		earthRadiusRatio: 10.97,
		axialTiltDeg: 3.13,
		rotationPeriodHours: 9.925,
		orbitalPeriodDays: 4332.59,
		meanDistanceAu: 5.204,
		temperatureKid: "Freezing gas clouds (-110 °C)",
		funFact: "Jupiter is so massive that more than 1,300 Earths could fit inside it! Its Great Red Spot is a giant storm bigger than Earth.",
		funFacts: [
			"Jupiter is the king of planets: more than 1,300 Earths could fit inside it, and it has more mass than all other planets in our system combined!",
			"Jupiter’s Great Red Spot is an enormous anticyclonic storm that has raged for at least 350 years and is wider than our entire planet Earth!",
			"Jupiter spins faster than any other planet, completing a full rotation in just 9.9 hours, which causes its equator to visibly bulge outward.",
			"Jupiter has 95 known moons! The four largest—Io, Europa, Ganymede, and Callisto—were discovered by Galileo Galilei in 1610.",
			"Jupiter’s moon Io is the most volcanically active world in the Solar System, shooting fiery sulfur plumes over 300 km into space!",
			"Europa hides a massive subsurface saltwater ocean underneath its cracked icy shell that contains more liquid water than all Earth oceans combined.",
			"Deep inside Jupiter, pressure is so extreme that hydrogen gas transforms into a conducting liquid called metallic hydrogen!"
		]
	},
	saturn: {
		id: "saturn",
		name: "Saturn",
		phonetic: "SAT-urn",
		colorHex: "#EAD6B8",
		massKg: 56834e22,
		radiusKm: 58232,
		earthRadiusRatio: 9.14,
		axialTiltDeg: 26.73,
		rotationPeriodHours: 10.656,
		orbitalPeriodDays: 10759.22,
		meanDistanceAu: 9.582,
		temperatureKid: "Extremely cold (-140 °C)",
		funFact: "Saturn's dazzling rings are made of billions of pieces of ice and rock, ranging from tiny dust specks to the size of houses!",
		funFacts: [
			"Saturn’s magnificent ring system spans 282,000 km across, yet the main rings are astonishingly paper-thin—often less than 10 meters thick!",
			"Saturn is the only planet in the Solar System less dense than liquid water! If you found an ocean bathtub large enough, Saturn would float.",
			"Saturn has 146 confirmed moons—more than any other planet in the Solar System!",
			"Saturn’s giant moon Titan has a dense nitrogen atmosphere, methane rainstorms, and sprawling lakes of liquid ethane and methane.",
			"Enceladus, another moon of Saturn, shoots geysers of salty water and organic molecules into space from deep ocean vents under its icy south pole.",
			"Saturn’s north pole features a bizarre, giant atmospheric hexagon—a persistent six-sided jet stream wide enough to fit two Earths inside!",
			"The particles in Saturn’s rings are 99% pure water ice, reflecting sunlight with incredible brilliance across the outer Solar System."
		]
	},
	uranus: {
		id: "uranus",
		name: "Uranus",
		phonetic: "YOOR-uh-nuhs",
		colorHex: "#7DE2D1",
		massKg: 8681e22,
		radiusKm: 25362,
		earthRadiusRatio: 3.98,
		axialTiltDeg: 97.77,
		rotationPeriodHours: -17.24,
		orbitalPeriodDays: 30685.4,
		meanDistanceAu: 19.201,
		temperatureKid: "Freezing ice giant (-195 °C)",
		funFact: "Uranus spins on its side like a rolling bowling ball! Scientists think a huge cosmic collision tilted it long ago.",
		funFacts: [
			"Uranus rolls around the Sun on its side with a dramatic axial tilt of 97.8°! A massive collision with an Earth-sized protoplanet likely tipped it over.",
			"Because Uranus lies on its side, each of its poles experiences 42 years of continuous daylight followed by 42 years of continuous freezing night!",
			"Uranus holds the record for the coldest recorded atmosphere of any planet in our Solar System, dropping down to a frosty -224 °C (-371 °F)!",
			"Uranus appears a pale cyan color because methane in its upper atmosphere absorbs red light and reflects cool blue-green wavelengths back into space.",
			"All 28 known moons of Uranus are uniquely named after literary characters from the works of William Shakespeare and Alexander Pope (like Puck, Miranda, and Ariel).",
			"Uranus has 13 delicate, dark rings that are composed of carbon-rich boulder-sized chunks and fine dust."
		]
	},
	neptune: {
		id: "neptune",
		name: "Neptune",
		phonetic: "NEP-toon",
		colorHex: "#3F88C5",
		massKg: 102413e21,
		radiusKm: 24622,
		earthRadiusRatio: 3.86,
		axialTiltDeg: 28.32,
		rotationPeriodHours: 16.11,
		orbitalPeriodDays: 60189,
		meanDistanceAu: 30.047,
		temperatureKid: "The coldest planet (-200 °C)",
		funFact: "Neptune has the fastest supersonic winds in the solar system, whipping through its blue methane atmosphere at over 2,000 km/h!",
		funFacts: [
			"Neptune has the fiercest winds in the entire Solar System, roaring at supersonic speeds over 2,100 km/h (1,300 mph)—faster than a fighter jet!",
			"Neptune takes 165 Earth years to orbit the Sun once! In 2011, it completed its very first full orbit since its astronomical discovery in 1846.",
			"Neptune was discovered using pure mathematics: astronomers noticed unexpected wobbles in Uranus’s orbit and calculated where Neptune must be hiding!",
			"Neptune’s largest moon, Triton, is the only large moon that orbits backwards (retrograde), showing it was captured from the frozen Kuiper Belt.",
			"Triton has cryovolcanoes (ice geysers) that blast liquid nitrogen and dark plumes 8 kilometers high into its thin atmosphere.",
			"Neptune’s rings are very faint and tenuous: the outermost Adams ring features famous clumped arcs named Liberté, Égalité, and Fraternité.",
			"Deep inside Neptune’s mantle of slushy water and methane ice, extreme pressures may compress carbon atoms into literal showers of falling diamonds!"
		]
	},
	moon: {
		id: "moon",
		name: "Moon",
		phonetic: "MOON",
		colorHex: "#CBD5E1",
		massKg: 7342e19,
		radiusKm: 1737.4,
		earthRadiusRatio: .272,
		axialTiltDeg: 1.54,
		rotationPeriodHours: 655.7,
		orbitalPeriodDays: 27.3216,
		meanDistanceAu: .00257,
		temperatureKid: "Extreme! (120 °C in day, -130 °C at night)",
		funFact: "The Moon is tidally locked to Earth, meaning the exact same face always points toward us in the night sky!",
		funFacts: [
			"The Moon is Earth’s only natural satellite and the fifth largest moon in our entire Solar System.",
			"Because the Moon has no atmosphere or wind, footprints left by Apollo astronauts will remain preserved in lunar dust for millions of years!",
			"The Moon is tidally locked to Earth, taking exactly 27.3 days to rotate once on its axis and orbit Earth once, so we only ever see one side.",
			"The gravitational pull of the Moon is what creates the ocean tides that rise and fall along Earth’s coastlines every day.",
			"Twelve human astronauts have walked on the surface of the Moon, beginning with Neil Armstrong and Buzz Aldrin during Apollo 11 in July 1969.",
			"The Moon is slowly drifting away from Earth at a speed of about 3.8 cm (1.5 in) per year—about the speed that human fingernails grow!"
		]
	},
	io: {
		id: "io",
		name: "Io",
		phonetic: "EYE-oh",
		colorHex: "#E6CC80",
		massKg: 8932e19,
		radiusKm: 1821.6,
		earthRadiusRatio: .286,
		axialTiltDeg: 0,
		rotationPeriodHours: 42.46,
		orbitalPeriodDays: 1.769,
		meanDistanceAu: .00282,
		temperatureKid: "Fiery & Frigid (-143 °C surface, lava at 1,000 °C)",
		funFact: "Io is the most volcanically active world in the entire Solar System, with over 400 active volcanoes spewing sulfur lakes!",
		funFacts: [
			"Io is the most volcanically active body in the entire Solar System, shooting fiery sulfur plumes over 300 kilometers into space!",
			"Jupiter’s immense gravitational tides squeeze and stretch Io like a stress ball, generating immense friction and internal volcanic heat.",
			"Io was discovered in 1610 by Galileo Galilei using the world’s very first astronomical telescope."
		]
	},
	europa: {
		id: "europa",
		name: "Europa",
		phonetic: "yoo-ROH-pah",
		colorHex: "#A0C4E8",
		massKg: 48e21,
		radiusKm: 1560.8,
		earthRadiusRatio: .245,
		axialTiltDeg: .1,
		rotationPeriodHours: 85.2,
		orbitalPeriodDays: 3.551,
		meanDistanceAu: .00449,
		temperatureKid: "Super Freezing Ice World (-160 °C)",
		funFact: "Under Europa’s frozen ice crust lies a global saltwater ocean with twice as much liquid water as all of Earth’s oceans combined!",
		funFacts: [
			"Europa’s surface is one of the smoothest in the solar system, crisscrossed by long rust-colored cracks in its thick ice crust.",
			"Scientists believe Europa’s deep subterranean ocean could harbor extraterrestrial life around warm hydrothermal vents.",
			"NASA launched the Europa Clipper mission to fly past Europa dozens of times to scan for ocean geysers and habitable zones."
		]
	},
	ganymede: {
		id: "ganymede",
		name: "Ganymede",
		phonetic: "GAN-ih-meed",
		colorHex: "#B8B09D",
		massKg: 14819e19,
		radiusKm: 2634.1,
		earthRadiusRatio: .413,
		axialTiltDeg: .2,
		rotationPeriodHours: 171.7,
		orbitalPeriodDays: 7.155,
		meanDistanceAu: .00716,
		temperatureKid: "Deep Freezing (-163 °C)",
		funFact: "Ganymede is the largest moon in the Solar System—it is even bigger than planet Mercury and dwarf planet Pluto!",
		funFacts: ["Ganymede is so gigantic that if it orbited the Sun directly instead of orbiting Jupiter, it would be classified as a major planet.", "Ganymede is the only moon in the entire Solar System known to generate its own internal magnetic field with auroral glow belts."]
	},
	callisto: {
		id: "callisto",
		name: "Callisto",
		phonetic: "kuh-LISS-toh",
		colorHex: "#8A8A99",
		massKg: 10759e19,
		radiusKm: 2410.3,
		earthRadiusRatio: .378,
		axialTiltDeg: 0,
		rotationPeriodHours: 400.5,
		orbitalPeriodDays: 16.689,
		meanDistanceAu: .01258,
		temperatureKid: "Frigid Ancient Ice (-140 °C)",
		funFact: "Callisto is the most heavily cratered object in the Solar System—its ancient, scarred ice surface has not changed for 4 billion years!",
		funFacts: ["Callisto’s surface is completely covered in impact craters, acting as a historical time capsule of the early Solar System.", "Because Callisto orbits farther from Jupiter than the other Galilean moons, it experiences very little radiation."]
	},
	titan: {
		id: "titan",
		name: "Titan",
		phonetic: "TY-tun",
		colorHex: "#E08A38",
		massKg: 13452e19,
		radiusKm: 2574.7,
		earthRadiusRatio: .404,
		axialTiltDeg: 0,
		rotationPeriodHours: 382.7,
		orbitalPeriodDays: 15.945,
		meanDistanceAu: .00817,
		temperatureKid: "Frigid Methane World (-179 °C)",
		funFact: "Titan has a dense golden atmosphere, clouds, and real rivers and lakes filled with liquid methane and ethane!",
		funFacts: ["Titan is the only moon in the Solar System with a dense, cloudy atmosphere—its surface pressure is 50% higher than Earth’s.", "In 2005, the robotic ESA Huygens probe parachuted through Titan’s golden clouds and touched down on a muddy plain of rounded water-ice pebbles."]
	},
	triton: {
		id: "triton",
		name: "Triton",
		phonetic: "TRY-ton",
		colorHex: "#70A8A4",
		massKg: 214e20,
		radiusKm: 1353.4,
		earthRadiusRatio: .212,
		axialTiltDeg: 0,
		rotationPeriodHours: -141,
		orbitalPeriodDays: 5.877,
		meanDistanceAu: .00237,
		temperatureKid: "Super Freezing Ice (-235 °C)",
		funFact: "Triton orbits backwards around Neptune! It shoots nitrogen ice geysers 8 km up into space.",
		funFacts: ["Triton is one of the coldest objects ever visited in our Solar System, with surface temperatures dropping to -235 °C (-391 °F).", "Astronomers believe Triton was once a dwarf planet in the frozen Kuiper Belt (like Pluto) that was captured by Neptune’s massive gravity."]
	}
};
// src/utils/useMediaQuery.ts
/**
* Custom hook to detect mobile and narrow viewports reactively.
*/
function useIsMobile(breakpoint = 768) {
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.innerWidth <= breakpoint;
	});
	useEffect(() => {
		if (typeof window === "undefined") return;
		const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
		const updateMatch = (e) => {
			setIsMobile(e.matches);
		};
		updateMatch(mediaQuery);
		try {
			mediaQuery.addEventListener("change", updateMatch);
			return () => mediaQuery.removeEventListener("change", updateMatch);
		} catch {
			mediaQuery.addListener(updateMatch);
			return () => mediaQuery.removeListener(updateMatch);
		}
	}, [breakpoint]);
	return isMobile;
}
// src/state/useSnapshotStore.ts
var useSnapshotStore = create((set) => ({
	isOpen: false,
	imageUrl: null,
	imageBlob: null,
	targetTitle: "",
	dateStr: "",
	isFlashing: false,
	openSnapshot: ({ imageUrl, imageBlob, targetTitle, dateStr }) => set({
		isOpen: true,
		imageUrl,
		imageBlob,
		targetTitle,
		dateStr
	}),
	closeSnapshot: () => set({
		isOpen: false,
		imageUrl: null,
		imageBlob: null
	}),
	triggerFlash: () => {
		set({ isFlashing: true });
		setTimeout(() => {
			set({ isFlashing: false });
		}, 400);
	}
}));
// src/science/time.ts
/**
* Astronomical Time and Julian Ephemeris Date (JDE) Engine.
* 
* Implements bidirectional conversions between Gregorian calendar dates (UTC)
* and Julian Ephemeris Date (JDE / Terrestrial Time), based on Jean Meeus' Astronomical Algorithms.
*/
var J2000_JDE = 2451545;
var TIME_SPEED_RATES = {
	realtime: 1 / 86400,
	hour_per_sec: 1 / 24,
	day_per_sec: 1,
	week_per_sec: 7,
	month_per_sec: 30,
	year_per_sec: 365.25
};
/**
* Converts a JavaScript Date (UTC) to Julian Ephemeris Date (JDE).
*/
function dateToJde(date) {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	const hour = date.getUTCHours();
	const minute = date.getUTCMinutes();
	const second = date.getUTCSeconds() + date.getUTCMilliseconds() / 1e3;
	let y = year;
	let m = month;
	if (m <= 2) {
		y -= 1;
		m += 12;
	}
	const A = Math.floor(y / 100);
	const B = 2 - A + Math.floor(A / 4);
	const dayFraction = (hour + minute / 60 + second / 3600) / 24;
	return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + dayFraction + B - 1524.5;
}
/**
* Converts a Julian Ephemeris Date (JDE) to a JavaScript Date object (UTC).
*/
function jdeToDate(jde) {
	const jd = jde + .5;
	const Z = Math.floor(jd);
	const F = jd - Z;
	let A = Z;
	if (Z >= 2299161) {
		const alpha = Math.floor((Z - 1867216.25) / 36524.25);
		A = Z + 1 + alpha - Math.floor(alpha / 4);
	}
	const B = A + 1524;
	const C = Math.floor((B - 122.1) / 365.25);
	const D = Math.floor(365.25 * C);
	const E = Math.floor((B - D) / 30.6001);
	const dayWithFraction = B - D - Math.floor(30.6001 * E) + F;
	const day = Math.floor(dayWithFraction);
	const month = E < 14 ? E - 1 : E - 13;
	const year = month > 2 ? C - 4716 : C - 4715;
	const dayFraction = dayWithFraction - day;
	const totalSeconds = Math.round(dayFraction * 86400);
	const hour = Math.floor(totalSeconds / 3600);
	const minute = Math.floor(totalSeconds % 3600 / 60);
	const second = totalSeconds % 60;
	return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}
/**
* Formats a JDE into a child-friendly Gregorian date string (e.g. "November 5, 2026").
*/
function formatJde(jde) {
	return jdeToDate(jde).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC"
	});
}
// src/science/useSimulationClock.ts
var useSimulationClock = create((set, get) => ({
	currentJde: dateToJde(/* @__PURE__ */ new Date()),
	isPaused: false,
	direction: 1,
	activePreset: "day_per_sec",
	speedDaysPerSec: TIME_SPEED_RATES.day_per_sec,
	advanceTime: (deltaSeconds) => {
		const { isPaused, direction, speedDaysPerSec, currentJde } = get();
		if (!isPaused) set({ currentJde: currentJde + deltaSeconds * speedDaysPerSec * direction });
	},
	togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
	setPaused: (paused) => set({ isPaused: paused }),
	reverseDirection: () => set((state) => ({ direction: -state.direction })),
	setSpeedPreset: (preset) => set({
		activePreset: preset,
		speedDaysPerSec: TIME_SPEED_RATES[preset]
	}),
	jumpToJde: (jde) => set({ currentJde: jde }),
	resetToToday: () => set({ currentJde: dateToJde(/* @__PURE__ */ new Date()) }),
	resetToJ2000: () => set({ currentJde: J2000_JDE })
}));
// src/utils/captureSnapshot.ts
async function captureSnapshot() {
	const store = useSnapshotStore.getState();
	store.triggerFlash();
	await new Promise((resolve) => setTimeout(resolve, 80));
	const webglCanvas = document.querySelector("canvas");
	if (!webglCanvas) {
		console.error("No WebGL canvas found for snapshot");
		return;
	}
	const selectedId = useFocusStore.getState().selectedId;
	const currentJde = useSimulationClock.getState().currentJde;
	const dateStr = formatJde(currentJde);
	let targetTitle = "The Solar System";
	let targetSubtitle = "Heliocentric Planetary Observation";
	if (selectedId && selectedId in PLANETARY_METADATA) {
		const meta = PLANETARY_METADATA[selectedId];
		targetTitle = `${meta.name}`;
		targetSubtitle = `${meta.temperatureKid} • Radius ${meta.radiusKm.toLocaleString()} km`;
	}
	const w = webglCanvas.width;
	const h = webglCanvas.height;
	const composite = document.createElement("canvas");
	composite.width = w;
	composite.height = h;
	const ctx = composite.getContext("2d");
	if (!ctx) return;
	ctx.drawImage(webglCanvas, 0, 0, w, h);
	const s = Math.max(.65, Math.min(w, h) / 1080);
	const drawRoundRect = (x, y, rw, rh, r) => {
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, rw, rh, r);
		else ctx.rect(x, y, rw, rh);
	};
	ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
	ctx.lineWidth = Math.max(2, 4 * s);
	ctx.strokeRect(12 * s, 12 * s, w - 24 * s, h - 24 * s);
	const badgeW = 310 * s;
	const badgeH = 46 * s;
	drawRoundRect(24 * s, 24 * s, badgeW, badgeH, 14 * s);
	ctx.fillStyle = "rgba(10, 16, 30, 0.75)";
	ctx.fill();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
	ctx.lineWidth = 1.5 * s;
	ctx.stroke();
	ctx.fillStyle = "#38bdf8";
	ctx.font = `bold ${Math.round(15 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
	ctx.textBaseline = "middle";
	ctx.fillText("🚀 KIDSTAR SPACE EXPLORER", 42 * s, 24 * s + badgeH / 2);
	const cardW = Math.min(w - 48 * s, 460 * s);
	const cardH = 92 * s;
	const cardY = h - 24 * s - cardH;
	drawRoundRect(24 * s, cardY, cardW, cardH, 18 * s);
	ctx.fillStyle = "rgba(10, 16, 30, 0.78)";
	ctx.fill();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
	ctx.lineWidth = 1.5 * s;
	ctx.stroke();
	ctx.fillStyle = "#ffffff";
	ctx.font = `bold ${Math.round(26 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
	ctx.fillText(targetTitle, 44 * s, cardY + 34 * s);
	ctx.fillStyle = "#94a3b8";
	ctx.font = `${Math.round(13 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
	ctx.fillText(targetSubtitle, 44 * s, cardY + 68 * s);
	const dateW = Math.min(w - 48 * s, 340 * s);
	const dateH = 46 * s;
	const dateX = w - 24 * s - dateW;
	const dateY = h - 24 * s - dateH;
	if (dateX > 24 * s + cardW + 16 * s) {
		drawRoundRect(dateX, dateY, dateW, dateH, 14 * s);
		ctx.fillStyle = "rgba(10, 16, 30, 0.75)";
		ctx.fill();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
		ctx.lineWidth = 1.5 * s;
		ctx.stroke();
		ctx.fillStyle = "#e2e8f0";
		ctx.font = `600 ${Math.round(13 * s)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		ctx.fillText(`📅 ${dateStr}`, dateX + 18 * s, dateY + dateH / 2);
	}
	composite.toBlob((blob) => {
		if (!blob) return;
		const imageUrl = URL.createObjectURL(blob);
		store.openSnapshot({
			imageUrl,
			imageBlob: blob,
			targetTitle,
			dateStr
		});
	}, "image/png", 1);
}
// src/science/astroEngineAdapter.ts
/**
* High-Precision Astronomical Adapter based on Astronomy Engine (by Don Cross).
* 
* Bridges high-precision astronomical ephemerides with the KidStar 3D graphics
* and simulation clock architecture.
*/
/**
* Resolves a date from either a standard JS Date or a Julian Ephemeris Date (JDE).
*/
function resolveDate(input) {
	return typeof input === "number" ? jdeToDate(input) : input;
}
Astronomy.Rotation_EQJ_ECL();
/**
* Calculates high-precision Geocentric position of Earth's Moon
* based on the ELP-2000/82 analytical lunar theory.
*/
function getLunarEphemeris(dateInput) {
	const date = resolveDate(dateInput);
	const ecl = Astronomy.EclipticGeoMoon(date);
	const latRad = ecl.lat * Math.PI / 180;
	const lonRad = ecl.lon * Math.PI / 180;
	const cosLat = Math.cos(latRad);
	const eclX = ecl.dist * cosLat * Math.cos(lonRad);
	const eclY = ecl.dist * cosLat * Math.sin(lonRad);
	const eclZ = ecl.dist * Math.sin(latRad);
	const sceneX = eclX;
	const sceneY = eclZ;
	const sceneZ = eclY;
	const distAu = ecl.dist;
	const distKm = distAu * Astronomy.KM_PER_AU;
	const safeDist = distAu > 1e-12 ? distAu : 1;
	return {
		positionAu: [
			sceneX,
			sceneY,
			sceneZ
		],
		direction: [
			sceneX / safeDist,
			sceneY / safeDist,
			sceneZ / safeDist
		],
		eclipticLonDeg: ecl.lon,
		eclipticLatDeg: ecl.lat,
		distanceAu: distAu,
		distanceKm: distKm
	};
}
/**
* Calculates current Lunar Phase details including illuminated percentage,
* phase angle, visual magnitude, and astronomical phase name.
*/
function getLunarPhaseInfo(dateInput) {
	const date = resolveDate(dateInput);
	const phaseDeg = Astronomy.MoonPhase(date);
	const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
	let phaseName = "New Moon";
	let emoji = "🌑";
	if (phaseDeg >= 354 || phaseDeg < 6) {
		phaseName = "New Moon";
		emoji = "🌑";
	} else if (phaseDeg < 84) {
		phaseName = "Waxing Crescent";
		emoji = "🌒";
	} else if (phaseDeg < 96) {
		phaseName = "First Quarter";
		emoji = "🌓";
	} else if (phaseDeg < 174) {
		phaseName = "Waxing Gibbous";
		emoji = "🌔";
	} else if (phaseDeg < 186) {
		phaseName = "Full Moon";
		emoji = "🌕";
	} else if (phaseDeg < 264) {
		phaseName = "Waning Gibbous";
		emoji = "🌖";
	} else if (phaseDeg < 276) {
		phaseName = "Third Quarter";
		emoji = "🌗";
	} else {
		phaseName = "Waning Crescent";
		emoji = "🌘";
	}
	const fraction = Math.max(0, Math.min(1, illum.phase_fraction));
	return {
		phaseDeg,
		fraction,
		percent: Math.round(fraction * 1e3) / 10,
		phaseName,
		emoji,
		visualMagnitude: illum.mag
	};
}
// src/science/satelliteCatalog.ts
var SATELLITE_CATALOG = {
	iss: {
		id: "iss",
		name: "International Space Station (ISS)",
		shortName: "ISS",
		noradId: 25544,
		tleLine1: "1 25544U 98067A   24098.54166667  .00016717  00000-0  10270-3 0  9002",
		tleLine2: "2 25544  51.6416 250.2104 0004240 120.3542 245.8920 15.50000000445678",
		category: "space_station",
		colorHex: "#38bdf8",
		launchYear: 1998,
		orbitType: "Low Earth Orbit (LEO, 51.6° Inclination)",
		nominalAltitudeKm: 420,
		nominalPeriodMinutes: 92.8,
		speedKmH: 27600,
		crewCapacity: 7,
		iconEmoji: "🛰️",
		funFact: "The ISS is as large as a full football field and travels so fast that astronauts on board experience 16 sunrises and 16 sunsets every day!",
		funFacts: [
			"The International Space Station travels at a blistering speed of 27,600 km/h (17,150 mph)—orbiting Earth once every 92 minutes!",
			"It has been continuously inhabited by humans from across the world since November 2000, serving as a floating microgravity laboratory.",
			"The station’s huge solar array wingspan measures 109 meters (357 feet), making it one of the brightest human-made objects visible from Earth at night.",
			"Astronauts on the ISS must exercise for at least 2 hours every day to prevent their muscles and bones from weakening in zero gravity.",
			"Water on the ISS is so precious that 98% of all sweat, moisture, and urine is purified and recycled back into clean, drinkable water!"
		]
	},
	hubble: {
		id: "hubble",
		name: "Hubble Space Telescope",
		shortName: "Hubble",
		noradId: 20580,
		tleLine1: "1 20580U 90037B   24098.50000000  .00001000  00000-0  50000-4 0  9998",
		tleLine2: "2 20580  28.4695 105.1205 0002850 140.2310 219.8920 15.08000000854210",
		category: "telescope",
		colorHex: "#a855f7",
		launchYear: 1990,
		orbitType: "Low Earth Orbit (LEO, 28.5° Inclination)",
		nominalAltitudeKm: 535,
		nominalPeriodMinutes: 95.4,
		speedKmH: 27300,
		crewCapacity: 0,
		iconEmoji: "🔭",
		funFact: "Hubble orbits above Earth’s blurry atmosphere, capturing crystal-clear photos of newborn stars, giant nebulae, and colliding galaxies!",
		funFacts: [
			"Hubble was launched into space in 1990 aboard Space Shuttle Discovery and has made over 1.5 million astronomical observations.",
			"Because it has no thrusters that burn fuel, Hubble turns itself around in space using spinning reaction wheels and gyroscopes.",
			"Astronauts visited Hubble 5 times during daring Space Shuttle spacewalk missions to repair its instruments and install upgrades in orbit.",
			"Hubble’s famous \"Deep Field\" photograph peered into a seemingly empty dark patch of sky and revealed over 3,000 never-before-seen distant galaxies!"
		]
	},
	tiangong: {
		id: "tiangong",
		name: "Tiangong Space Station",
		shortName: "Tiangong",
		noradId: 48274,
		tleLine1: "1 48274U 21035A   24098.50000000  .00012000  00000-0  15000-3 0  9991",
		tleLine2: "2 48274  41.4720 180.5210 0003500 200.1250 160.0120 15.62000000168420",
		category: "space_station",
		colorHex: "#ef4444",
		launchYear: 2021,
		orbitType: "Low Earth Orbit (LEO, 41.5° Inclination)",
		nominalAltitudeKm: 390,
		nominalPeriodMinutes: 92.2,
		speedKmH: 27600,
		crewCapacity: 3,
		iconEmoji: "🏮",
		funFact: "\"Tiangong\" means \"Heavenly Palace\" in Chinese. It features a robotic arm that can crawl along the outside of the station like an acrobat!",
		funFacts: [
			"Tiangong is a T-shaped modern orbital station consisting of the Tianhe core module and two science experiment modules (Wentian and Mengtian).",
			"The station is continuously operated by crews of three Chinese taikonauts who conduct plant biology and fluid physics experiments.",
			"It is equipped with high-efficiency flexible gallium-arsenide solar wings that pivot continuously to face the Sun."
		]
	},
	landsat: {
		id: "landsat",
		name: "Landsat 8 Earth Observer",
		shortName: "Landsat 8",
		noradId: 39084,
		tleLine1: "1 39084U 13008A   24098.50000000  .00000050  00000-0  20000-4 0  9995",
		tleLine2: "2 39084  98.2150 150.1200 0001200  90.4500 270.1200 14.57100000584210",
		category: "earth_observation",
		colorHex: "#10b981",
		launchYear: 2013,
		orbitType: "Sun-Synchronous Polar Orbit (98.2° Inclination)",
		nominalAltitudeKm: 705,
		nominalPeriodMinutes: 98.9,
		speedKmH: 26900,
		crewCapacity: 0,
		iconEmoji: "🌍",
		funFact: "Landsat 8 flies over the North and South poles every 99 minutes, taking high-resolution color portraits of Earth’s rainforests, coral reefs, and polar ice sheets!",
		funFacts: [
			"The joint NASA/USGS Landsat program has been observing and photographing Earth continuously from space since 1972.",
			"Landsat 8 maps the entire planet surface every 16 days, helping firefighters monitor forest wildfires and farmers monitor crop health.",
			"It flies in a \"sun-synchronous\" orbit, meaning it crosses the equator at the exact same local solar time (10:00 AM) on every single pass!"
		]
	}
};
Object.values(SATELLITE_CATALOG);
// src/science/satellitePropagator.ts
/**
* SGP4 / SDP4 High-Precision Satellite Propagator Engine.
* 
* Powered by satellite.js to calculate true Earth-Centered Inertial (ECI) coordinates,
* geodetic latitude/longitude, altitude, speed, and 3D visual orbits.
*/
var EARTH_RADIUS_KM = 6371;
var satRecCache = /* @__PURE__ */ new Map();
/**
* Returns or creates the parsed SatRec record for a given satellite.
*/
function getSatRec(metadata) {
	let record = satRecCache.get(metadata.id);
	if (!record) {
		record = twoline2satrec(metadata.tleLine1, metadata.tleLine2);
		satRecCache.set(metadata.id, record);
	}
	return record;
}
/**
* Propagates satellite position and computes complete telemetry at a given date.
*/
function propagateSatellite(metadata, date, earthRadiusScene) {
	const satrec = getSatRec(metadata);
	const pv = propagate(satrec, date);
	if (!pv || !pv.position || typeof pv.position !== "object" || !("x" in pv.position)) return {
		id: metadata.id,
		name: metadata.name,
		positionScene: [
			0,
			earthRadiusScene + .35,
			0
		],
		speedKmH: metadata.speedKmH,
		altitudeKm: metadata.nominalAltitudeKm,
		latitudeDeg: 0,
		longitudeDeg: 0,
		direction: [
			0,
			1,
			0
		],
		isValid: false
	};
	const posX = pv.position.x;
	const posY = pv.position.y;
	const posZ = pv.position.z;
	const velX = pv.velocity && typeof pv.velocity === "object" && "x" in pv.velocity ? pv.velocity.x : 0;
	const velY = pv.velocity && typeof pv.velocity === "object" && "y" in pv.velocity ? pv.velocity.y : 0;
	const velZ = pv.velocity && typeof pv.velocity === "object" && "z" in pv.velocity ? pv.velocity.z : 0;
	const distKm = Math.hypot(posX, posY, posZ);
	const altitudeKm = Math.max(0, distKm - EARTH_RADIUS_KM);
	const speedKmH = Math.hypot(velX, velY, velZ) * 3600;
	const gmst = gstime(date);
	const geodetic = eciToGeodetic(pv.position, gmst);
	const latitudeDeg = degreesLat(geodetic.latitude);
	const longitudeDeg = degreesLong(geodetic.longitude);
	const safeDistKm = distKm > 1e-6 ? distKm : 1;
	const dirX = posX / safeDistKm;
	const dirY = posZ / safeDistKm;
	const dirZ = -posY / safeDistKm;
	const sceneDist = earthRadiusScene + (.3 + altitudeKm / 1e3 * .16);
	const sceneX = dirX * sceneDist;
	const sceneY = dirY * sceneDist;
	const sceneZ = dirZ * sceneDist;
	return {
		id: metadata.id,
		name: metadata.name,
		positionScene: [
			sceneX,
			sceneY,
			sceneZ
		],
		speedKmH: Math.round(speedKmH),
		altitudeKm: Math.round(altitudeKm * 10) / 10,
		latitudeDeg: Math.round(latitudeDeg * 100) / 100,
		longitudeDeg: Math.round(longitudeDeg * 100) / 100,
		direction: [
			dirX,
			dirY,
			dirZ
		],
		isValid: true
	};
}
// src/science/cometCatalog.ts
var DEG_TO_RAD = Math.PI / 180;
var GAUSSIAN_K = .01720209895;
var AU_KM$1 = 149597870.7;
var COMET_CATALOG = {
	halley: {
		id: "halley",
		name: "1P/Halley (Halley's Comet)",
		shortName: "Halley",
		elements: {
			a: 17.834,
			e: .96714,
			I: 162.26,
			Omega: 58.42,
			omega: 111.33,
			Tp: 2446470.96,
			periodDays: 75.32 * 365.256898
		},
		periodYears: 75.3,
		perihelionAu: .586,
		aphelionAu: 35.08,
		lastPerihelion: "February 9, 1986",
		nextPerihelion: "July 28, 2061",
		colorHex: "#38bdf8",
		tailColorIon: "#60a5fa",
		tailColorDust: "#f8fafc",
		iconEmoji: "☄️",
		description: "The most famous periodic comet in human history, returning every 75-76 years in a backwards (retrograde) orbit inclined 162° to the planets.",
		funFacts: [
			"Halley's Comet is the only known periodic comet that is regularly visible to the naked eye from Earth, recorded by skywatchers since at least 240 BC.",
			"In 1986, an international armada of 5 spacecraft (including the ESA Giotto probe) flew right past its icy nucleus, revealing a dark peanut-shaped potato of dust and ice!",
			"When Earth crosses the orbital trail of dust shed by Halley twice a year, it creates the Eta Aquariids (May) and Orionids (October) meteor showers.",
			"Halley will reach its closest point to the Sun next on July 28, 2061, when it will shine brightly in the northern dawn skies!"
		]
	},
	neowise: {
		id: "neowise",
		name: "C/2020 F3 (NEOWISE)",
		shortName: "NEOWISE",
		elements: {
			a: 360,
			e: .99918,
			I: 128.94,
			Omega: 61.01,
			omega: 37.28,
			Tp: 2459034.24,
			periodDays: 6800 * 365.256898
		},
		periodYears: 6800,
		perihelionAu: .295,
		aphelionAu: 720,
		lastPerihelion: "July 3, 2020",
		nextPerihelion: "Year ~8820",
		colorHex: "#f59e0b",
		tailColorIon: "#38bdf8",
		tailColorDust: "#fef08a",
		iconEmoji: "☄️",
		description: "The spectacular naked-eye comet of Summer 2020 that developed stunning dual blue-ion and curving golden-dust tails after brushing inside Mercury’s orbit.",
		funFacts: [
			"Discovered on March 27, 2020, by the NEOWISE space infrared telescope, it survived its scorching pass just 44 million km from the Sun.",
			"During July 2020, it became bright enough to be easily seen with the naked eye even near light-polluted cities throughout the Northern Hemisphere.",
			"Its orbit was changed significantly by the gravitational pull of the giant planets: its orbital period was shortened from ~4,500 years to ~6,800 years!"
		]
	},
	hale_bopp: {
		id: "hale_bopp",
		name: "C/1995 O1 (Hale-Bopp)",
		shortName: "Hale-Bopp",
		elements: {
			a: 186,
			e: .995086,
			I: 89.43,
			Omega: 282.47,
			omega: 130.59,
			Tp: 2450539.64,
			periodDays: 2530 * 365.256898
		},
		periodYears: 2530,
		perihelionAu: .914,
		aphelionAu: 370.8,
		lastPerihelion: "April 1, 1997",
		nextPerihelion: "Year ~4530",
		colorHex: "#ec4899",
		tailColorIon: "#818cf8",
		tailColorDust: "#fbcfe8",
		iconEmoji: "☄️",
		description: "The \"Great Comet of 1997\", possessing an unusually massive nucleus (60 km wide) that remained visible to the naked eye for a record-breaking 18 months.",
		funFacts: [
			"Hale-Bopp was discovered independently in July 1995 by Alan Hale and Thomas Bopp when it was still past Jupiter’s orbit—unusually early for a comet!",
			"Its nucleus is estimated to be roughly 60 kilometers across, about six times larger than Halley’s Comet.",
			"Its orbit plunges almost vertically through the planetary plane at an inclination of 89.4°, meaning it will never collide with the inner planets."
		]
	},
	encke: {
		id: "encke",
		name: "2P/Encke",
		shortName: "Encke",
		elements: {
			a: 2.215,
			e: .84827,
			I: 11.78,
			Omega: 334.57,
			omega: 186.55,
			Tp: 2460239.95,
			periodDays: 3.3 * 365.256898
		},
		periodYears: 3.3,
		perihelionAu: .336,
		aphelionAu: 4.09,
		lastPerihelion: "October 22, 2023",
		nextPerihelion: "February 9, 2027",
		colorHex: "#34d399",
		tailColorIon: "#6ee7b7",
		tailColorDust: "#e2e8f0",
		iconEmoji: "☄️",
		description: "The shortest-period comet known in the solar system, completing an orbit around the Sun every 3.3 years between Mercury and Jupiter.",
		funFacts: [
			"Encke was only the second periodic comet discovered in history after Halley, with its recurring orbit calculated by Johann Franz Encke in 1819.",
			"Because it passes so close to the Sun every 3.3 years, it has made thousands of revolutions, leaving behind the Taurid meteor stream responsible for Halloween fireballs!",
			"Encke has lost most of its volatile surface ices and is on its way to eventually becoming a dark, dormant asteroid-like body."
		]
	}
};
/**
* Solves Kepler's Equation M = E - e*sin(E) for high eccentricity (e > 0.8 up to 0.999).
* Employs cubic Halley root-finding with Barker-like initial guesses for fast convergence.
*/
function solveKeplerHighEccentricity(M, e) {
	let m = M % (2 * Math.PI);
	if (m > Math.PI) m -= 2 * Math.PI;
	if (m < -Math.PI) m += 2 * Math.PI;
	let E;
	if (e > .8 && Math.abs(m) < .25) E = Math.cbrt(6 * m / (1 - e + .1 * e));
	else E = m + e * Math.sin(m);
	for (let iter = 0; iter < 12; iter++) {
		const sinE = Math.sin(E);
		const cosE = Math.cos(E);
		const f = E - e * sinE - m;
		if (Math.abs(f) < 1e-13) break;
		const fPrime = 1 - e * cosE;
		const delta = f / (fPrime - f * (e * sinE) / (2 * fPrime));
		E -= delta;
		if (Math.abs(delta) < 1e-13) break;
	}
	return E;
}
/**
* Computes high-precision heliocentric 3D position, velocity, and tail directions for a comet.
*/
function getCometHeliocentricPosition(cometOrId, jde) {
	const el = (typeof cometOrId === "string" ? COMET_CATALOG[cometOrId] : cometOrId).elements;
	const n = GAUSSIAN_K / Math.pow(el.a, 1.5);
	const E = solveKeplerHighEccentricity(n * (jde - el.Tp), el.e);
	const cosE = Math.cos(E);
	const sinE = Math.sin(E);
	const sqrtOneMinusE2 = Math.sqrt(Math.max(0, 1 - el.e * el.e));
	const xPrime = el.a * (cosE - el.e);
	const yPrime = el.a * sqrtOneMinusE2 * sinE;
	const r = el.a * (1 - el.e * cosE);
	const vxPrime = -el.a * el.a * n * sinE / r;
	const vyPrime = el.a * el.a * n * sqrtOneMinusE2 * cosE / r;
	const I_rad = el.I * DEG_TO_RAD;
	const Omega_rad = el.Omega * DEG_TO_RAD;
	const omega_rad = el.omega * DEG_TO_RAD;
	const cosOmega = Math.cos(omega_rad);
	const sinOmega = Math.sin(omega_rad);
	const cosNode = Math.cos(Omega_rad);
	const sinNode = Math.sin(Omega_rad);
	const cosI = Math.cos(I_rad);
	const sinI = Math.sin(I_rad);
	const Px = cosOmega * cosNode - sinOmega * sinNode * cosI;
	const Py = cosOmega * sinNode + sinOmega * cosNode * cosI;
	const Pz = sinOmega * sinI;
	const Qx = -sinOmega * cosNode - cosOmega * sinNode * cosI;
	const Qy = -sinOmega * sinNode + cosOmega * cosNode * cosI;
	const Qz = cosOmega * sinI;
	const x = Px * xPrime + Qx * yPrime;
	const y = Py * xPrime + Qy * yPrime;
	const z = Pz * xPrime + Qz * yPrime;
	const vx = Px * vxPrime + Qx * vyPrime;
	const vy = Py * vxPrime + Qy * vyPrime;
	const vz = Pz * vxPrime + Qz * vyPrime;
	const vMagAuDay = Math.sqrt(vx * vx + vy * vy + vz * vz);
	const speedKmS = vMagAuDay * AU_KM$1 / 86400;
	const antiSolarDir = [
		x / r,
		y / r,
		z / r
	];
	const velocityDir = [
		vx / vMagAuDay,
		vy / vMagAuDay,
		vz / vMagAuDay
	];
	const trueAnomalyRad = Math.atan2(sqrtOneMinusE2 * sinE, cosE - el.e);
	return {
		position: {
			x,
			y,
			z
		},
		velocity: {
			x: vx,
			y: vy,
			z: vz
		},
		distanceAu: r,
		speedKmS,
		antiSolarDir,
		velocityDir,
		trueAnomalyRad,
		eccentricAnomalyRad: E
	};
}
// src/science/nasaNeoApi.ts
var LUNAR_DISTANCE_KM = 384400;
var AU_KM = 149597870.7;
var CURATED_FAMOUS_ASTEROIDS = [
	{
		id: "99942",
		name: "99942 Apophis",
		diameterMeters: {
			min: 340,
			max: 375,
			avg: 357
		},
		isPotentiallyHazardous: true,
		absoluteMagnitudeH: 19.2,
		closeApproachDate: "2029-04-13",
		closeApproachDateFull: "2029-Apr-13 21:46",
		epochDateCloseApproach: 187081116e4,
		relativeVelocityKmS: 7.43,
		missDistanceKm: 31600,
		missDistanceLunar: 31600 / LUNAR_DISTANCE_KM,
		missDistanceAu: 31600 / AU_KM,
		orbitingBody: "Earth",
		jplUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=99942",
		isCuratedFallback: true,
		funFact: "On Friday, April 13, 2029, the 370-meter Apophis will make a historic flyby closer to Earth than our own weather satellites, visible to 2 billion people with the naked eye!"
	},
	{
		id: "54464875",
		name: "2024 MK",
		diameterMeters: {
			min: 140,
			max: 280,
			avg: 210
		},
		isPotentiallyHazardous: true,
		absoluteMagnitudeH: 21.6,
		closeApproachDate: "2024-06-29",
		closeApproachDateFull: "2024-Jun-29 13:41",
		epochDateCloseApproach: 171966846e4,
		relativeVelocityKmS: 9.37,
		missDistanceKm: 290150,
		missDistanceLunar: 290150 / LUNAR_DISTANCE_KM,
		missDistanceAu: 290150 / AU_KM,
		orbitingBody: "Earth",
		jplUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54464875",
		isCuratedFallback: true,
		funFact: "Discovered only 13 days before closest approach, skyscraper-sized 2024 MK safely passed within 75% of the distance to the Moon on June 29, 2024."
	},
	{
		id: "54345244",
		name: "2023 DZ2",
		diameterMeters: {
			min: 45,
			max: 95,
			avg: 70
		},
		isPotentiallyHazardous: false,
		absoluteMagnitudeH: 24.2,
		closeApproachDate: "2023-03-25",
		closeApproachDateFull: "2023-Mar-25 19:49",
		epochDateCloseApproach: 167977374e4,
		relativeVelocityKmS: 7.78,
		missDistanceKm: 174650,
		missDistanceLunar: 174650 / LUNAR_DISTANCE_KM,
		missDistanceAu: 174650 / AU_KM,
		orbitingBody: "Earth",
		jplUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54345244",
		isCuratedFallback: true,
		funFact: "This city-block-sized asteroid passed less than halfway to the Moon on March 25, 2023, bright enough to be seen with small amateur telescopes."
	},
	{
		id: "101955",
		name: "101955 Bennu",
		diameterMeters: {
			min: 490,
			max: 512,
			avg: 501
		},
		isPotentiallyHazardous: true,
		absoluteMagnitudeH: 20.9,
		closeApproachDate: "2135-09-25",
		closeApproachDateFull: "2135-Sep-25 12:00",
		epochDateCloseApproach: 52299888e5,
		relativeVelocityKmS: 6.25,
		missDistanceKm: 75e4,
		missDistanceLunar: 75e4 / LUNAR_DISTANCE_KM,
		missDistanceAu: 75e4 / AU_KM,
		orbitingBody: "Earth",
		jplUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=101955",
		isCuratedFallback: true,
		funFact: "NASA’s OSIRIS-REx spacecraft touched down on Bennu’s surface in 2020, vacuumed up 250 grams of pristine cosmic gravel, and parachuted it safely back to Earth!"
	},
	{
		id: "65803",
		name: "65803 Didymos & Dimorphos",
		diameterMeters: {
			min: 160,
			max: 780,
			avg: 470
		},
		isPotentiallyHazardous: true,
		absoluteMagnitudeH: 18.1,
		closeApproachDate: "2022-09-26",
		closeApproachDateFull: "2022-Sep-26 23:14",
		epochDateCloseApproach: 166423404e4,
		relativeVelocityKmS: 6.6,
		missDistanceKm: 106e5,
		missDistanceLunar: 106e5 / LUNAR_DISTANCE_KM,
		missDistanceAu: 106e5 / AU_KM,
		orbitingBody: "Earth",
		jplUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=65803",
		isCuratedFallback: true,
		funFact: "On September 26, 2022, NASA’s DART mission intentionally slammed a vending-machine-sized probe into Dimorphos at 22,500 km/h, proving humanity can deflect dangerous asteroids!"
	},
	{
		id: "54054450",
		name: "2020 QG",
		diameterMeters: {
			min: 3,
			max: 6,
			avg: 4.5
		},
		isPotentiallyHazardous: false,
		absoluteMagnitudeH: 29.8,
		closeApproachDate: "2020-08-16",
		closeApproachDateFull: "2020-Aug-16 04:09",
		epochDateCloseApproach: 159755094e4,
		relativeVelocityKmS: 12.33,
		missDistanceKm: 9320,
		missDistanceLunar: 9320 / LUNAR_DISTANCE_KM,
		missDistanceAu: 9320 / AU_KM,
		orbitingBody: "Earth",
		jplUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54054450",
		isCuratedFallback: true,
		funFact: "Passed just 2,950 kilometers above the surface of the Indian Ocean—the closest recorded non-impacting asteroid flyby in astronomical history!"
	}
];
/**
* Returns a human-friendly string for miss distance.
* e.g. "0.75 LD (290,150 km)"
*/
function formatMissDistance(missLunar, missKm) {
	if (missLunar < 1) return `${missLunar.toFixed(2)} LD (${missKm.toLocaleString()} km - Inside Moon's Orbit!)`;
	return `${missLunar.toFixed(1)} LD (${missKm.toLocaleString()} km)`;
}
// src/state/useAsteroidStore.ts
var useAsteroidStore = create((set) => ({
	asteroids: CURATED_FAMOUS_ASTEROIDS,
	showAsteroids: true,
	activeAlert: null,
	selectedAsteroidId: null,
	isLoading: false,
	setAsteroids: (list) => set({ asteroids: list }),
	toggleShowAsteroids: () => set((state) => ({ showAsteroids: !state.showAsteroids })),
	setActiveAlert: (alert) => set({ activeAlert: alert }),
	selectAsteroid: (id) => set({ selectedAsteroidId: id })
}));
// src/components/ui/FactCard.tsx
var FactCard = () => {
	const selectedId = useFocusStore((state) => state.selectedId);
	const clearSelection = useFocusStore((state) => state.clearSelection);
	const isTourOpen = useTourStore((state) => state.isOpen);
	const isTutorialOpen = useTutorialStore((state) => state.isOpen);
	const isMobile = useIsMobile();
	const [factIndex, setFactIndex] = useState(0);
	const [isExpanded, setIsExpanded] = useState(false);
	useEffect(() => {
		setFactIndex(0);
		setIsExpanded(false);
	}, [selectedId]);
	const isSatellite = !!selectedId && selectedId in SATELLITE_CATALOG;
	const satMeta = isSatellite ? SATELLITE_CATALOG[selectedId] : null;
	const isComet = !!selectedId && selectedId in COMET_CATALOG;
	const cometMeta = isComet ? COMET_CATALOG[selectedId] : null;
	const asteroidMeta = useAsteroidStore((state) => state.asteroids).find((a) => a.id === selectedId) || null;
	const isAsteroid = !!asteroidMeta;
	const isPlanetOrMoon = !!selectedId && selectedId in PLANETARY_METADATA;
	if (!selectedId || !isPlanetOrMoon && !isSatellite && !isComet && !isAsteroid || isTourOpen || isTutorialOpen) return null;
	const currentJde = useSimulationClock((state) => state.currentJde);
	const meta = isPlanetOrMoon ? PLANETARY_METADATA[selectedId] : null;
	const satTelemetry = isSatellite && satMeta ? propagateSatellite(satMeta, jdeToDate(currentJde), 2) : null;
	const cometState = isComet && cometMeta ? getCometHeliocentricPosition(cometMeta, currentJde) : null;
	const displayName = isSatellite ? satMeta.name : isComet ? cometMeta.name : isAsteroid ? asteroidMeta.name : meta.name;
	const displayColor = isSatellite ? satMeta.colorHex : isComet ? cometMeta.colorHex : isAsteroid ? asteroidMeta.isPotentiallyHazardous ? "#f59e0b" : "#38bdf8" : meta.colorHex;
	const displayEmoji = isSatellite ? satMeta.iconEmoji : isComet ? cometMeta.iconEmoji : isAsteroid ? "🪨" : null;
	const lunarPhase = selectedId === "moon" ? getLunarPhaseInfo(currentJde) : null;
	const lunarEphem = selectedId === "moon" ? getLunarEphemeris(currentJde) : null;
	const rawFacts = isSatellite ? satMeta.funFacts : isComet ? cometMeta.funFacts : isAsteroid ? [
		asteroidMeta.funFact || `Asteroid ${asteroidMeta.name} passes Earth at a miss distance of ${asteroidMeta.missDistanceLunar.toFixed(2)} Lunar Distances (${asteroidMeta.missDistanceKm.toLocaleString()} km).`,
		`Estimated diameter is between ${asteroidMeta.diameterMeters.min} and ${asteroidMeta.diameterMeters.max} meters, moving at a relative speed of ${asteroidMeta.relativeVelocityKmS} km/s.`,
		asteroidMeta.isPotentiallyHazardous ? "Classified as a Potentially Hazardous Asteroid (PHA) due to its size (>140m) and proximity to Earth’s orbit." : "Safe planetary flyby passing through the Earth-Moon system."
	] : meta.funFacts && meta.funFacts.length > 0 ? meta.funFacts : [meta.funFact];
	const facts = rawFacts && rawFacts.length > 0 ? rawFacts : ["In orbit exploring our Solar System!"];
	const currentFactIndex = Math.min(Math.max(0, factIndex), facts.length - 1);
	const handleSpeak = () => {
		if ("speechSynthesis" in window) {
			window.speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(displayName);
			utterance.rate = .85;
			utterance.pitch = 1.05;
			window.speechSynthesis.speak(utterance);
		}
	};
	const handlePrevFact = (e) => {
		e.stopPropagation();
		setFactIndex((prev) => prev > 0 ? prev - 1 : facts.length - 1);
	};
	const handleNextFact = (e) => {
		e.stopPropagation();
		setFactIndex((prev) => prev < facts.length - 1 ? prev + 1 : 0);
	};
	if (isMobile && !isExpanded) return /* @__PURE__ */ jsxs("div", {
		style: {
			position: "fixed",
			bottom: "12px",
			left: "12px",
			right: "12px",
			zIndex: 60,
			background: "rgba(10, 16, 30, 0.90)",
			backdropFilter: "blur(20px)",
			WebkitBackdropFilter: "blur(20px)",
			border: `1.5px solid ${displayColor}55`,
			borderRadius: "24px",
			padding: "10px 14px",
			color: "#ffffff",
			fontFamily: "system-ui, -apple-system, sans-serif",
			boxShadow: `0 12px 36px rgba(0, 0, 0, 0.7), 0 0 25px ${displayColor}22`,
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			animation: "slideUpBottom 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
		},
		children: [/* @__PURE__ */ jsxs("div", {
			onClick: () => setIsExpanded(true),
			style: {
				display: "flex",
				alignItems: "center",
				gap: "10px",
				cursor: "pointer",
				flex: 1
			},
			children: [/* @__PURE__ */ jsx("span", { style: {
				width: "14px",
				height: "14px",
				borderRadius: "50%",
				background: displayColor,
				boxShadow: `0 0 10px ${displayColor}`,
				flexShrink: 0
			} }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: "6px"
				},
				children: [/* @__PURE__ */ jsx("span", {
					style: {
						fontSize: "17px",
						fontWeight: 700,
						color: "#f8fafc"
					},
					children: displayName
				}), /* @__PURE__ */ jsx("button", {
					onClick: (e) => {
						e.stopPropagation();
						handleSpeak();
					},
					title: "Pronounce",
					style: {
						background: "rgba(255, 255, 255, 0.08)",
						border: "none",
						borderRadius: "50%",
						width: "24px",
						height: "24px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "#38bdf8",
						cursor: "pointer"
					},
					children: /* @__PURE__ */ jsx(Volume2, { size: 13 })
				})]
			}), /* @__PURE__ */ jsx("div", {
				style: {
					fontSize: "11px",
					color: "#94a3b8"
				},
				children: isSatellite && satMeta ? `${satMeta.iconEmoji} ${satMeta.orbitType} • Altitude ${satTelemetry?.altitudeKm || satMeta.nominalAltitudeKm} km` : isComet && cometMeta ? `${cometMeta.iconEmoji} Period ${cometMeta.periodYears} yrs • ${cometState ? `${cometState.distanceAu.toFixed(2)} AU from Sun` : "Comet"}` : isAsteroid && asteroidMeta ? `🪨 ${asteroidMeta.missDistanceLunar.toFixed(2)} LD from Earth • ${asteroidMeta.relativeVelocityKmS} km/s` : meta && meta.meanDistanceAu > 0 ? `${meta.meanDistanceAu} AU • ${meta.temperatureKid.split("(")[0].trim()}` : "Star"
			})] })]
		}), /* @__PURE__ */ jsxs("div", {
			style: {
				display: "flex",
				alignItems: "center",
				gap: "8px"
			},
			children: [/* @__PURE__ */ jsxs("button", {
				onClick: () => setIsExpanded(true),
				style: {
					background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25))",
					border: "1px solid rgba(56, 189, 248, 0.45)",
					borderRadius: "16px",
					padding: "6px 12px",
					color: "#ffffff",
					fontSize: "12px",
					fontWeight: 700,
					display: "flex",
					alignItems: "center",
					gap: "4px",
					cursor: "pointer",
					whiteSpace: "nowrap"
				},
				children: [/* @__PURE__ */ jsx(Sparkles, {
					size: 13,
					color: "#38bdf8"
				}), " Facts ▲"]
			}), /* @__PURE__ */ jsx("button", {
				onClick: clearSelection,
				title: "Deselect and Return to Overview",
				style: {
					background: "rgba(255, 255, 255, 0.08)",
					border: "none",
					borderRadius: "50%",
					width: "30px",
					height: "30px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#cbd5e1",
					cursor: "pointer"
				},
				children: /* @__PURE__ */ jsx(X, { size: 16 })
			})]
		})]
	});
	return /* @__PURE__ */ jsxs("div", {
		style: {
			position: isMobile ? "fixed" : "absolute",
			bottom: isMobile ? 0 : "auto",
			top: isMobile ? "auto" : "20px",
			left: isMobile ? 0 : "auto",
			right: isMobile ? 0 : "20px",
			width: isMobile ? "100%" : "360px",
			maxWidth: isMobile ? "100vw" : "calc(100vw - 40px)",
			maxHeight: isMobile ? "68vh" : "calc(100vh - 40px)",
			overflowY: "auto",
			background: isMobile ? "rgba(10, 16, 30, 0.95)" : "rgba(10, 16, 30, 0.78)",
			backdropFilter: "blur(20px)",
			WebkitBackdropFilter: "blur(20px)",
			border: "1px solid rgba(255, 255, 255, 0.16)",
			borderBottom: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.16)",
			borderRadius: isMobile ? "24px 24px 0 0" : "24px",
			padding: isMobile ? "14px 18px 24px" : "24px",
			color: "#ffffff",
			fontFamily: "system-ui, -apple-system, sans-serif",
			boxShadow: isMobile ? `0 -10px 40px rgba(0, 0, 0, 0.7), 0 0 40px ${displayColor}22` : `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px ${displayColor}22`,
			zIndex: 70,
			animation: isMobile ? "slideUpBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards"
		},
		children: [
			isMobile && /* @__PURE__ */ jsxs("div", {
				onClick: () => setIsExpanded(false),
				style: {
					cursor: "pointer",
					padding: "4px 0 10px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "4px"
				},
				children: [/* @__PURE__ */ jsx("div", { style: {
					width: "36px",
					height: "4px",
					borderRadius: "2px",
					background: "rgba(255, 255, 255, 0.3)"
				} }), /* @__PURE__ */ jsx("span", {
					style: {
						fontSize: "10px",
						color: "#94a3b8",
						fontWeight: 600
					},
					children: "Tap to collapse ▼"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				style: {
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					marginBottom: isMobile ? "12px" : "16px"
				},
				children: [/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "8px"
					},
					children: [
						displayEmoji ? /* @__PURE__ */ jsx("span", {
							style: {
								fontSize: isMobile ? "18px" : "22px",
								lineHeight: 1
							},
							children: displayEmoji
						}) : /* @__PURE__ */ jsx("span", { style: {
							width: isMobile ? "12px" : "14px",
							height: isMobile ? "12px" : "14px",
							borderRadius: "50%",
							background: displayColor,
							boxShadow: `0 0 10px ${displayColor}`
						} }),
						/* @__PURE__ */ jsx("h2", {
							style: {
								margin: 0,
								fontSize: isMobile ? "22px" : "28px",
								fontWeight: 700,
								letterSpacing: "-0.5px"
							},
							children: displayName
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: handleSpeak,
							title: "Pronounce name",
							style: {
								background: "rgba(255, 255, 255, 0.1)",
								border: "none",
								borderRadius: "50%",
								width: "32px",
								height: "32px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#38bdf8",
								cursor: "pointer",
								transition: "transform 0.15s, background 0.15s"
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.transform = "scale(1.1)";
								e.currentTarget.style.background = "rgba(56, 189, 248, 0.2)";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.transform = "scale(1.0)";
								e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
							},
							children: /* @__PURE__ */ jsx(Volume2, { size: 16 })
						})
					]
				}) }), /* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "8px"
					},
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => captureSnapshot(),
						title: `Take photo of ${displayName} & share`,
						style: {
							background: "rgba(255, 255, 255, 0.08)",
							border: "1px solid rgba(255, 255, 255, 0.15)",
							borderRadius: "50%",
							width: "32px",
							height: "32px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#38bdf8",
							cursor: "pointer",
							transition: "all 0.15s ease"
						},
						onMouseEnter: (e) => {
							e.currentTarget.style.transform = "scale(1.1)";
							e.currentTarget.style.background = "rgba(56, 189, 248, 0.2)";
						},
						onMouseLeave: (e) => {
							e.currentTarget.style.transform = "scale(1.0)";
							e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
						},
						children: /* @__PURE__ */ jsx(Camera, { size: 16 })
					}), /* @__PURE__ */ jsx("button", {
						onClick: clearSelection,
						title: "Close details",
						style: {
							background: "rgba(255, 255, 255, 0.08)",
							border: "none",
							borderRadius: "50%",
							width: "32px",
							height: "32px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#cbd5e1",
							cursor: "pointer"
						},
						children: /* @__PURE__ */ jsx(X, { size: 18 })
					})]
				})]
			}),
			selectedId === "moon" && lunarPhase && /* @__PURE__ */ jsxs("div", {
				style: {
					background: "linear-gradient(135deg, rgba(203, 213, 225, 0.16), rgba(56, 189, 248, 0.10))",
					border: "1.5px solid rgba(203, 213, 225, 0.35)",
					borderRadius: "14px",
					padding: "12px 14px",
					marginBottom: "14px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					boxShadow: "0 4px 18px rgba(0, 0, 0, 0.35)"
				},
				children: [/* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "12px"
					},
					children: [/* @__PURE__ */ jsx("span", {
						style: {
							fontSize: "30px",
							lineHeight: 1
						},
						children: lunarPhase.emoji
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "15px",
							fontWeight: 700,
							color: "#f8fafc",
							display: "flex",
							alignItems: "center",
							gap: "6px"
						},
						children: [/* @__PURE__ */ jsx("span", { children: lunarPhase.phaseName }), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "12px",
								color: "#38bdf8",
								fontWeight: 600
							},
							children: [
								"(",
								lunarPhase.percent,
								"%)"
							]
						})]
					}), /* @__PURE__ */ jsx("div", {
						style: {
							fontSize: "11px",
							color: "#cbd5e1",
							marginTop: "2px"
						},
						children: lunarEphem ? `${Math.round(lunarEphem.distanceKm).toLocaleString()} km from Earth` : "384,400 km from Earth"
					})] })]
				}), /* @__PURE__ */ jsx("div", {
					style: {
						width: "42px",
						height: "6px",
						borderRadius: "3px",
						background: "rgba(255, 255, 255, 0.15)",
						overflow: "hidden"
					},
					title: `${lunarPhase.percent}% Illuminated`,
					children: /* @__PURE__ */ jsx("div", { style: {
						width: `${lunarPhase.percent}%`,
						height: "100%",
						background: "#38bdf8",
						borderRadius: "3px"
					} })
				})]
			}),
			isAsteroid && asteroidMeta ? /* @__PURE__ */ jsxs("div", {
				style: {
					background: asteroidMeta.isPotentiallyHazardous ? "linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(239, 68, 68, 0.08))" : "linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(99, 102, 241, 0.08))",
					border: `1px solid ${asteroidMeta.isPotentiallyHazardous ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.3)"}`,
					borderRadius: "14px",
					padding: "12px 14px",
					marginBottom: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "8px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", {
							style: {
								fontSize: "11px",
								color: asteroidMeta.isPotentiallyHazardous ? "#fbbf24" : "#38bdf8",
								fontWeight: 700,
								letterSpacing: "0.5px",
								textTransform: "uppercase"
							},
							children: asteroidMeta.isPotentiallyHazardous ? "⚠️ Near-Earth Hazard Radar" : "🪨 Near-Earth Asteroid Flyby"
						}), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "11px",
								color: asteroidMeta.isPotentiallyHazardous ? "#fbbf24" : "#4ade80",
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								gap: "4px"
							},
							children: [/* @__PURE__ */ jsx("span", { style: {
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								background: asteroidMeta.isPotentiallyHazardous ? "#fbbf24" : "#4ade80",
								boxShadow: asteroidMeta.isPotentiallyHazardous ? "0 0 6px #fbbf24" : "0 0 6px #4ade80"
							} }), asteroidMeta.isPotentiallyHazardous ? "PHA Alert" : "Close Approach"]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "8px"
						},
						children: [/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "10px",
									color: "#94a3b8"
								},
								children: "Close Approach Distance"
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 700,
									color: "#f8fafc"
								},
								children: [asteroidMeta.missDistanceLunar.toFixed(2), " LD"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "10px",
									color: "#64748b"
								},
								children: [Math.round(asteroidMeta.missDistanceKm).toLocaleString(), " km"]
							})
						] }), /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "10px",
									color: "#94a3b8"
								},
								children: "Relative Velocity"
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 700,
									color: "#f8fafc"
								},
								children: [asteroidMeta.relativeVelocityKmS.toFixed(1), " km/s"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "10px",
									color: "#64748b"
								},
								children: [(asteroidMeta.relativeVelocityKmS * 3600).toLocaleString(void 0, { maximumFractionDigits: 0 }), " km/h"]
							})
						] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "11px",
							color: "#cbd5e1",
							borderTop: "1px solid rgba(255, 255, 255, 0.08)",
							paddingTop: "6px",
							display: "flex",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", { children: "Close Approach Date:" }), /* @__PURE__ */ jsx("span", {
							style: {
								fontWeight: 600,
								color: "#f8fafc"
							},
							children: asteroidMeta.closeApproachDateFull || asteroidMeta.closeApproachDate
						})]
					})
				]
			}) : isComet && cometMeta && cometState ? /* @__PURE__ */ jsxs("div", {
				style: {
					background: `linear-gradient(135deg, ${cometMeta.colorHex}18, rgba(56, 189, 248, 0.08))`,
					border: `1px solid ${cometMeta.colorHex}44`,
					borderRadius: "14px",
					padding: "12px 14px",
					marginBottom: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "8px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", {
							style: {
								fontSize: "11px",
								color: cometMeta.colorHex,
								fontWeight: 700,
								letterSpacing: "0.5px",
								textTransform: "uppercase"
							},
							children: "☄️ Real-Time Comet Telemetry"
						}), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "11px",
								color: cometState.distanceAu < 3.5 ? "#38bdf8" : "#94a3b8",
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								gap: "4px"
							},
							children: [/* @__PURE__ */ jsx("span", { style: {
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								background: cometState.distanceAu < 3.5 ? "#38bdf8" : "#64748b",
								boxShadow: cometState.distanceAu < 3.5 ? "0 0 6px #38bdf8" : "none"
							} }), cometState.distanceAu < 3.5 ? "Active Tails" : "Dormant Ices"]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "8px"
						},
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							style: {
								fontSize: "10px",
								color: "#94a3b8"
							},
							children: "Distance from Sun"
						}), /* @__PURE__ */ jsxs("div", {
							style: {
								fontSize: "14px",
								fontWeight: 700,
								color: "#f8fafc"
							},
							children: [cometState.distanceAu.toFixed(2), " AU"]
						})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							style: {
								fontSize: "10px",
								color: "#94a3b8"
							},
							children: "Orbital Speed"
						}), /* @__PURE__ */ jsxs("div", {
							style: {
								fontSize: "14px",
								fontWeight: 700,
								color: "#f8fafc"
							},
							children: [cometState.speedKmS.toFixed(1), " km/s"]
						})] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "11px",
							color: "#cbd5e1",
							borderTop: "1px solid rgba(255, 255, 255, 0.08)",
							paddingTop: "6px",
							display: "flex",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", { children: "Outgassing Status:" }), /* @__PURE__ */ jsx("span", {
							style: {
								fontWeight: 600,
								color: cometState.distanceAu < 3.5 ? "#6ee7b7" : "#94a3b8"
							},
							children: cometState.distanceAu < 3.5 ? "Dual Ion & Dust Tails" : "Frozen Past Thermal Sublimation Line"
						})]
					})
				]
			}) : isSatellite && satMeta ? /* @__PURE__ */ jsxs("div", {
				style: {
					background: "linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.08))",
					border: "1px solid rgba(56, 189, 248, 0.3)",
					borderRadius: "14px",
					padding: "12px 14px",
					marginBottom: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "8px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", {
							style: {
								fontSize: "11px",
								color: "#38bdf8",
								fontWeight: 700,
								letterSpacing: "0.5px",
								textTransform: "uppercase"
							},
							children: "🛰️ Live Orbit Telemetry (SGP4)"
						}), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "11px",
								color: "#4ade80",
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								gap: "4px"
							},
							children: [/* @__PURE__ */ jsx("span", { style: {
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								background: "#4ade80",
								boxShadow: "0 0 6px #4ade80"
							} }), "Active"]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "8px"
						},
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							style: {
								fontSize: "10px",
								color: "#94a3b8"
							},
							children: "Altitude"
						}), /* @__PURE__ */ jsx("div", {
							style: {
								fontSize: "14px",
								fontWeight: 700,
								color: "#f8fafc"
							},
							children: satTelemetry ? `${Math.round(satTelemetry.altitudeKm).toLocaleString()} km` : `${satMeta.nominalAltitudeKm} km`
						})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							style: {
								fontSize: "10px",
								color: "#94a3b8"
							},
							children: "Orbital Speed"
						}), /* @__PURE__ */ jsx("div", {
							style: {
								fontSize: "14px",
								fontWeight: 700,
								color: "#f8fafc"
							},
							children: satTelemetry ? `${(satTelemetry.speedKmH / 3600).toFixed(2)} km/s` : `${(satMeta.speedKmH / 3600).toFixed(2)} km/s`
						})] })]
					}),
					satTelemetry && /* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "11px",
							color: "#cbd5e1",
							borderTop: "1px solid rgba(255, 255, 255, 0.08)",
							paddingTop: "6px",
							display: "flex",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", { children: "Sub-satellite:" }), /* @__PURE__ */ jsxs("span", {
							style: {
								fontWeight: 600,
								color: "#e2e8f0"
							},
							children: [
								Math.abs(satTelemetry.latitudeDeg).toFixed(2),
								"°",
								satTelemetry.latitudeDeg >= 0 ? "N" : "S",
								", ",
								Math.abs(satTelemetry.longitudeDeg).toFixed(2),
								"°",
								satTelemetry.longitudeDeg >= 0 ? "E" : "W"
							]
						})]
					})
				]
			}) : meta ? /* @__PURE__ */ jsxs("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: "8px",
					background: "rgba(255, 255, 255, 0.06)",
					border: "1px solid rgba(255, 255, 255, 0.1)",
					borderRadius: "14px",
					padding: "10px 14px",
					marginBottom: "16px"
				},
				children: [/* @__PURE__ */ jsx(Thermometer, {
					size: 18,
					color: "#f59e0b",
					style: { flexShrink: 0 }
				}), /* @__PURE__ */ jsx("span", {
					style: {
						fontSize: "13px",
						color: "#f1f5f9",
						lineHeight: 1.4
					},
					children: meta.temperatureKid
				})]
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				style: {
					background: `linear-gradient(135deg, ${displayColor}22, rgba(255, 255, 255, 0.04))`,
					border: `1px solid ${displayColor}44`,
					borderRadius: "16px",
					padding: "14px",
					marginBottom: "20px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: "10px"
						},
						children: [/* @__PURE__ */ jsxs("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: "6px",
								color: "#fbbf24",
								fontSize: "12px",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.5px"
							},
							children: [/* @__PURE__ */ jsx(Sparkles, { size: 14 }), " Did You Know?"]
						}), /* @__PURE__ */ jsxs("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: "6px"
							},
							children: [
								/* @__PURE__ */ jsxs("span", {
									style: {
										fontSize: "11px",
										color: "#94a3b8",
										fontWeight: 600,
										fontVariantNumeric: "tabular-nums",
										marginRight: "2px"
									},
									children: [
										currentFactIndex + 1,
										" / ",
										facts.length
									]
								}),
								/* @__PURE__ */ jsx("button", {
									onClick: handlePrevFact,
									title: "Previous fun fact",
									"aria-label": "Previous fun fact",
									style: {
										background: "rgba(255, 255, 255, 0.08)",
										border: "1px solid rgba(255, 255, 255, 0.15)",
										borderRadius: "8px",
										width: "26px",
										height: "26px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "#f8fafc",
										cursor: "pointer",
										transition: "all 0.15s ease"
									},
									onMouseEnter: (e) => {
										e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)";
										e.currentTarget.style.transform = "scale(1.08)";
									},
									onMouseLeave: (e) => {
										e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
										e.currentTarget.style.transform = "scale(1.0)";
									},
									children: /* @__PURE__ */ jsx(ChevronLeft, { size: 15 })
								}),
								/* @__PURE__ */ jsx("button", {
									onClick: handleNextFact,
									title: "Next fun fact",
									"aria-label": "Next fun fact",
									style: {
										background: "rgba(255, 255, 255, 0.08)",
										border: "1px solid rgba(255, 255, 255, 0.15)",
										borderRadius: "8px",
										width: "26px",
										height: "26px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "#f8fafc",
										cursor: "pointer",
										transition: "all 0.15s ease"
									},
									onMouseEnter: (e) => {
										e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)";
										e.currentTarget.style.transform = "scale(1.08)";
									},
									onMouseLeave: (e) => {
										e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
										e.currentTarget.style.transform = "scale(1.0)";
									},
									children: /* @__PURE__ */ jsx(ChevronRight, { size: 15 })
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						style: {
							margin: "0 0 12px 0",
							fontSize: "13.5px",
							lineHeight: 1.55,
							color: "#f8fafc",
							minHeight: "48px",
							animation: "fadeIn 0.25s ease-out forwards"
						},
						children: facts[currentFactIndex]
					}, currentFactIndex),
					/* @__PURE__ */ jsx("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							paddingTop: "2px"
						},
						children: facts.map((_, i) => /* @__PURE__ */ jsx("button", {
							onClick: (e) => {
								e.stopPropagation();
								setFactIndex(i);
							},
							title: `Go to fact ${i + 1}`,
							"aria-label": `Go to fact ${i + 1}`,
							style: {
								border: "none",
								padding: 0,
								cursor: "pointer",
								width: i === currentFactIndex ? "18px" : "6px",
								height: "6px",
								borderRadius: "3px",
								background: i === currentFactIndex ? displayColor : "rgba(255, 255, 255, 0.25)",
								boxShadow: i === currentFactIndex ? `0 0 8px ${displayColor}` : "none",
								transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
							}
						}, i))
					})
				]
			}),
			isAsteroid && asteroidMeta ? /* @__PURE__ */ jsxs("div", {
				style: {
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "10px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Globe, { size: 13 }), " Estimated Size"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: asteroidMeta.diameterMeters.min === asteroidMeta.diameterMeters.max ? `~${asteroidMeta.diameterMeters.min} m` : `${asteroidMeta.diameterMeters.min}–${asteroidMeta.diameterMeters.max} m`
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px"
								},
								children: asteroidMeta.diameterMeters.max >= 1e3 ? `${(asteroidMeta.diameterMeters.max / 1e3).toFixed(1)} km diameter` : "Near-Earth Object"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Orbit, { size: 13 }), " Miss Distance"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [asteroidMeta.missDistanceLunar.toFixed(2), " LD"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: [asteroidMeta.missDistanceAu.toFixed(4), " AU from Earth"]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Thermometer, { size: 13 }), " Flyby Speed"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [asteroidMeta.relativeVelocityKmS.toFixed(1), " km/s"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px"
								},
								children: "Hyperbolic Trajectory"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Clock, { size: 13 }), " Classification"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600,
									color: asteroidMeta.isPotentiallyHazardous ? "#fbbf24" : "#4ade80"
								},
								children: asteroidMeta.isPotentiallyHazardous ? "PHA Hazard" : "Non-Hazardous"
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: ["Abs. Mag H: ", asteroidMeta.absoluteMagnitudeH !== void 0 ? asteroidMeta.absoluteMagnitudeH.toFixed(1) : "N/A"]
							})
						]
					})
				]
			}) : isComet && cometMeta ? /* @__PURE__ */ jsxs("div", {
				style: {
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "10px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Orbit, { size: 13 }), " Orbital Period"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [cometMeta.periodYears, " yrs"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px"
								},
								children: ["e = ", cometMeta.elements.e.toFixed(3)]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Thermometer, { size: 13 }), " Perihelion (Closest)"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [cometMeta.perihelionAu, " AU"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: cometMeta.lastPerihelion.split(",")[0]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Globe, { size: 13 }), " Aphelion (Farthest)"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [cometMeta.aphelionAu, " AU"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px"
								},
								children: "Deep Kuiper / Oort"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Clock, { size: 13 }), " Next Return"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: cometMeta.nextPerihelion.split(",")[0]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: "Next Perihelion"
							})
						]
					})
				]
			}) : isSatellite && satMeta ? /* @__PURE__ */ jsxs("div", {
				style: {
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "10px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Globe, { size: 13 }), " Orbit Altitude"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [satMeta.nominalAltitudeKm.toLocaleString(), " km"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px"
								},
								children: satMeta.orbitType
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Orbit, { size: 13 }), " Orbital Period"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [satMeta.nominalPeriodMinutes.toFixed(1), " mins"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: [
									"~",
									(1440 / satMeta.nominalPeriodMinutes).toFixed(1),
									" orbits / day"
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx("span", {
									style: { fontSize: "11px" },
									children: "👨‍🚀"
								}), " Crew Capacity"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: satMeta.crewCapacity > 0 ? `${satMeta.crewCapacity} astronauts` : "Robotic / Uncrewed"
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px",
									textTransform: "capitalize"
								},
								children: satMeta.category.replace("_", " ")
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Clock, { size: 13 }), " Launched"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: satMeta.launchYear
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: ["NORAD #", satMeta.noradId]
							})
						]
					})
				]
			}) : meta ? /* @__PURE__ */ jsxs("div", {
				style: {
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "10px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Globe, { size: 13 }), " Size (Radius)"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [meta.radiusKm.toLocaleString(), " km"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#38bdf8",
									marginTop: "2px"
								},
								children: meta.earthRadiusRatio === 1 ? "Earth Standard" : `${meta.earthRadiusRatio}× Earth`
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [
									/* @__PURE__ */ jsx(Orbit, { size: 13 }),
									" ",
									selectedId === "moon" ? "Orbital Period" : "Length of Year"
								]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: selectedId === "moon" ? "27.3 Earth days" : meta.orbitalPeriodDays === 0 ? "Center of System" : meta.orbitalPeriodDays >= 365 ? `${(meta.orbitalPeriodDays / 365.25).toFixed(1)} Earth yrs` : `${meta.orbitalPeriodDays.toFixed(0)} Earth days`
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: selectedId === "moon" ? "Tidally locked to Earth" : meta.meanDistanceAu > 0 ? `${meta.meanDistanceAu} AU from Sun` : "Origin"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx(Clock, { size: 13 }), " Day Length"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: Math.abs(meta.rotationPeriodHours) >= 48 ? `${(Math.abs(meta.rotationPeriodHours) / 24).toFixed(1)} Earth days` : `${Math.abs(meta.rotationPeriodHours).toFixed(1)} hours`
							}),
							meta.rotationPeriodHours < 0 && /* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "10px",
									color: "#f87171",
									marginTop: "2px"
								},
								children: "Spins Backwards!"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							background: "rgba(255, 255, 255, 0.04)",
							padding: "10px 12px",
							borderRadius: "12px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px",
									color: "#94a3b8",
									fontSize: "11px",
									marginBottom: "4px"
								},
								children: [/* @__PURE__ */ jsx("span", {
									style: { fontSize: "11px" },
									children: "📐"
								}), " Axial Tilt"]
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "14px",
									fontWeight: 600
								},
								children: [meta.axialTiltDeg.toFixed(1), "°"]
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "11px",
									color: "#94a3b8",
									marginTop: "2px"
								},
								children: meta.axialTiltDeg > 90 ? "Tilted on side" : "Orbital obliquity"
							})
						]
					})
				]
			}) : null
		]
	});
};
// src/components/spaceship/SpaceshipCockpitHUD.tsx
var SpaceshipCockpitHUD = () => {
	const isFlying = useSpaceshipStore((state) => state.isFlying);
	const destinationName = useSpaceshipStore((state) => state.destinationName);
	const destinationColor = useSpaceshipStore((state) => state.destinationColor);
	const arrivalNotice = useSpaceshipStore((state) => state.arrivalNotice);
	const [warpSpeed, setWarpSpeed] = useState(1.2);
	useEffect(() => {
		if (!isFlying) {
			setWarpSpeed(1);
			return;
		}
		const interval = setInterval(() => {
			setWarpSpeed((prev) => +(prev + .35 + Math.random() * .2).toFixed(1));
		}, 120);
		return () => clearInterval(interval);
	}, [isFlying]);
	return /* @__PURE__ */ jsxs("div", {
		style: {
			position: "absolute",
			inset: 0,
			pointerEvents: "none",
			zIndex: 45,
			overflow: "hidden",
			fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
		},
		children: [
			isFlying && /* @__PURE__ */ jsx("div", { style: {
				position: "absolute",
				inset: 0,
				boxShadow: "inset 0 0 100px rgba(56, 189, 248, 0.28), inset 0 0 40px rgba(0, 0, 0, 0.8)",
				border: "2px solid rgba(56, 189, 248, 0.18)",
				animation: "fadeIn 0.2s ease-out forwards"
			} }),
			isFlying && /* @__PURE__ */ jsxs("div", {
				style: {
					position: "absolute",
					top: "24px",
					left: "50%",
					transform: "translateX(-50%)",
					background: "linear-gradient(135deg, rgba(8, 14, 28, 0.92), rgba(15, 23, 42, 0.92))",
					backdropFilter: "blur(16px)",
					WebkitBackdropFilter: "blur(16px)",
					border: `1px solid ${destinationColor}88`,
					borderRadius: "24px",
					padding: "10px 24px",
					boxShadow: `0 8px 30px rgba(0, 0, 0, 0.7), 0 0 30px ${destinationColor}44`,
					display: "flex",
					alignItems: "center",
					gap: "12px",
					animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
				},
				children: [
					/* @__PURE__ */ jsx("span", {
						style: {
							width: "32px",
							height: "32px",
							borderRadius: "50%",
							background: `linear-gradient(135deg, ${destinationColor}, #38bdf8)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							boxShadow: `0 0 12px ${destinationColor}`
						},
						children: /* @__PURE__ */ jsx(Rocket, {
							size: 18,
							color: "#ffffff"
						})
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "11px",
							fontWeight: 700,
							color: "#38bdf8",
							letterSpacing: "1px",
							textTransform: "uppercase",
							display: "flex",
							alignItems: "center",
							gap: "6px"
						},
						children: [/* @__PURE__ */ jsx("span", { style: {
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							background: "#22c55e",
							boxShadow: "0 0 6px #22c55e"
						} }), "Warp Drive Active • Sublight Transit"]
					}), /* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "15px",
							fontWeight: 700,
							color: "#f8fafc",
							marginTop: "1px"
						},
						children: ["Traveling to ", /* @__PURE__ */ jsx("span", {
							style: { color: destinationColor },
							children: destinationName
						})]
					})] }),
					/* @__PURE__ */ jsxs("div", {
						style: {
							borderLeft: "1px solid rgba(255, 255, 255, 0.16)",
							paddingLeft: "12px",
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-end"
						},
						children: [/* @__PURE__ */ jsx("span", {
							style: {
								fontSize: "10px",
								color: "#94a3b8",
								textTransform: "uppercase"
							},
							children: "Velocity"
						}), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "13px",
								fontWeight: 700,
								color: "#38bdf8",
								fontVariantNumeric: "tabular-nums"
							},
							children: ["WARP ", warpSpeed]
						})]
					})
				]
			}),
			isFlying && /* @__PURE__ */ jsx("div", {
				style: {
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "80px",
					height: "80px",
					border: "1px dashed rgba(56, 189, 248, 0.4)",
					borderRadius: "50%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center"
				},
				children: /* @__PURE__ */ jsx("div", { style: {
					width: "8px",
					height: "8px",
					background: destinationColor,
					borderRadius: "50%",
					boxShadow: `0 0 10px ${destinationColor}`
				} })
			}),
			arrivalNotice && /* @__PURE__ */ jsxs("div", {
				style: {
					position: "absolute",
					top: "24px",
					left: "50%",
					transform: "translateX(-50%)",
					background: "linear-gradient(135deg, rgba(6, 78, 59, 0.92), rgba(15, 23, 42, 0.92))",
					backdropFilter: "blur(16px)",
					WebkitBackdropFilter: "blur(16px)",
					border: "1px solid rgba(74, 222, 128, 0.5)",
					borderRadius: "24px",
					padding: "10px 22px",
					boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7), 0 0 25px rgba(34, 197, 94, 0.35)",
					display: "flex",
					alignItems: "center",
					gap: "10px",
					color: "#ffffff",
					animation: "fadeIn 0.25s ease-out forwards"
				},
				children: [/* @__PURE__ */ jsx(CheckCircle2, {
					size: 20,
					color: "#4ade80"
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
					style: {
						fontSize: "14px",
						fontWeight: 700,
						color: "#f8fafc"
					},
					children: arrivalNotice
				}), /* @__PURE__ */ jsxs("div", {
					style: {
						fontSize: "11px",
						color: "#86efac",
						display: "flex",
						alignItems: "center",
						gap: "4px"
					},
					children: [/* @__PURE__ */ jsx(ShieldCheck, { size: 12 }), " Orbital insertion successful • Observation sensors active"]
				})] })]
			})
		]
	});
};
// src/components/ui/PlanetDock.tsx
var PLANET_DOCK_ITEMS = [
	{
		id: "sun",
		name: "Sun",
		color: PLANETARY_METADATA.sun.colorHex,
		radius: 4.2
	},
	{
		id: "mercury",
		name: "Mercury",
		color: PLANETARY_METADATA.mercury.colorHex,
		radius: .85
	},
	{
		id: "venus",
		name: "Venus",
		color: PLANETARY_METADATA.venus.colorHex,
		radius: 2.1
	},
	{
		id: "earth",
		name: "Earth",
		color: PLANETARY_METADATA.earth.colorHex,
		radius: 2.2
	},
	{
		id: "mars",
		name: "Mars",
		color: PLANETARY_METADATA.mars.colorHex,
		radius: 1.18
	},
	{
		id: "jupiter",
		name: "Jupiter",
		color: PLANETARY_METADATA.jupiter.colorHex,
		radius: 3.8
	},
	{
		id: "saturn",
		name: "Saturn",
		color: PLANETARY_METADATA.saturn.colorHex,
		radius: 3.2
	},
	{
		id: "uranus",
		name: "Uranus",
		color: PLANETARY_METADATA.uranus.colorHex,
		radius: 2.4
	},
	{
		id: "neptune",
		name: "Neptune",
		color: PLANETARY_METADATA.neptune.colorHex,
		radius: 2.3
	}
];
var MOON_DOCK_ITEMS = [
	{
		id: "moon",
		name: "Moon",
		parentName: "Earth",
		color: "#cbd5e1",
		radius: .59
	},
	{
		id: "io",
		name: "Io",
		parentName: "Jupiter",
		color: "#e6cc80",
		radius: .38
	},
	{
		id: "europa",
		name: "Europa",
		parentName: "Jupiter",
		color: "#a0c4e8",
		radius: .34
	},
	{
		id: "ganymede",
		name: "Ganymede",
		parentName: "Jupiter",
		color: "#b8b09d",
		radius: .58
	},
	{
		id: "callisto",
		name: "Callisto",
		parentName: "Jupiter",
		color: "#8a8a99",
		radius: .54
	},
	{
		id: "titan",
		name: "Titan",
		parentName: "Saturn",
		color: "#e08a38",
		radius: .56
	},
	{
		id: "triton",
		name: "Triton",
		parentName: "Neptune",
		color: "#a0d0e0",
		radius: .32
	}
];
/**
* PlanetDock: Collapsible dual-deck quick-jump navigation dock for Planets & Moons.
* 
* Features:
* - Independent collapsible decks for Planets & Moons (both default: open)
* - Color-coded body badges
* - Click triggers cinematic camera flight to that world
* - Overview button to smoothly reset camera to full solar system view
* - Space photo snapshot button
*/
var PlanetDock = () => {
	const [isPlanetsOpen, setIsPlanetsOpen] = useState(true);
	const [isMoonsOpen, setIsMoonsOpen] = useState(true);
	const isMobile = useIsMobile();
	const selectedId = useFocusStore((state) => state.selectedId);
	const selectBody = useFocusStore((state) => state.selectBody);
	const clearSelection = useFocusStore((state) => state.clearSelection);
	const areBothCollapsed = !isPlanetsOpen && !isMoonsOpen;
	const isTourOpen = useTourStore((state) => state.isOpen);
	if (isMobile && (selectedId !== null || isTourOpen)) return null;
	return /* @__PURE__ */ jsxs("div", {
		style: {
			position: "absolute",
			bottom: isMobile ? "10px" : "20px",
			left: "50%",
			transform: "translateX(-50%)",
			zIndex: 40,
			display: "flex",
			flexDirection: areBothCollapsed ? "row" : "column",
			alignItems: "center",
			gap: areBothCollapsed ? "8px" : isMobile ? "6px" : "8px",
			maxWidth: isMobile ? "calc(100vw - 16px)" : "calc(100vw - 32px)",
			width: isMobile ? "calc(100vw - 16px)" : "auto",
			pointerEvents: "none",
			transition: "all 0.25s ease"
		},
		children: [isMoonsOpen ? /* @__PURE__ */ jsxs("div", {
			style: {
				pointerEvents: "auto",
				display: "flex",
				alignItems: "center",
				gap: isMobile ? "4px" : "6px",
				background: "rgba(10, 16, 30, 0.88)",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				border: "1px solid rgba(255, 255, 255, 0.16)",
				borderRadius: "32px",
				padding: isMobile ? "4px 8px 4px 10px" : "5px 12px 5px 14px",
				boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
				maxWidth: "100%",
				overflowX: "auto",
				scrollbarWidth: "none",
				WebkitOverflowScrolling: "touch",
				fontFamily: "system-ui, -apple-system, sans-serif",
				animation: "fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
			},
			children: [
				/* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "4px",
						color: "#e2e8f0",
						fontSize: isMobile ? "11px" : "12px",
						fontWeight: 600,
						padding: "2px 4px",
						whiteSpace: "nowrap",
						flexShrink: 0
					},
					children: [/* @__PURE__ */ jsx("span", {
						style: { fontSize: isMobile ? "12px" : "13px" },
						children: "🌕"
					}), " Moons"]
				}),
				/* @__PURE__ */ jsx("div", { style: {
					width: "1px",
					height: "18px",
					background: "rgba(255, 255, 255, 0.15)",
					margin: "0 2px",
					flexShrink: 0
				} }),
				/* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: isMobile ? "4px" : "5px",
						overflowX: "auto",
						scrollbarWidth: "none",
						WebkitOverflowScrolling: "touch",
						flex: 1
					},
					children: [
						MOON_DOCK_ITEMS.map((item) => {
							const isSelected = selectedId === item.id;
							return /* @__PURE__ */ jsxs("button", {
								onClick: () => selectBody({
									id: item.id,
									name: item.name,
									radius: item.radius,
									type: "moon"
								}),
								title: `Fly to ${item.name} (${item.parentName}'s moon)`,
								style: {
									background: isSelected ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
									border: isSelected ? `2px solid ${item.color}` : "1px solid rgba(255, 255, 255, 0.08)",
									borderRadius: "16px",
									padding: isMobile ? "4px 7px" : "5px 9px",
									display: "flex",
									alignItems: "center",
									gap: "4px",
									color: isSelected ? "#ffffff" : "#cbd5e1",
									fontSize: isMobile ? "10.5px" : "11.5px",
									fontWeight: isSelected ? 600 : 400,
									cursor: "pointer",
									whiteSpace: "nowrap",
									flexShrink: 0,
									boxShadow: isSelected ? `0 0 12px ${item.color}55` : "none",
									transform: isSelected ? "scale(1.05)" : "scale(1.0)",
									transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
								},
								onMouseEnter: (e) => {
									e.currentTarget.style.transform = "scale(1.08)";
									e.currentTarget.style.borderColor = item.color;
								},
								onMouseLeave: (e) => {
									if (!isSelected) {
										e.currentTarget.style.transform = "scale(1.0)";
										e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
									}
								},
								children: [/* @__PURE__ */ jsx("span", { style: {
									width: "8px",
									height: "8px",
									borderRadius: "50%",
									background: item.color,
									boxShadow: `0 0 5px ${item.color}`,
									flexShrink: 0
								} }), /* @__PURE__ */ jsx("span", { children: item.name })]
							}, item.id);
						}),
						/* @__PURE__ */ jsx("div", { style: {
							width: "1px",
							height: "18px",
							background: "rgba(255, 255, 255, 0.15)",
							margin: "0 2px",
							flexShrink: 0
						} }),
						/* @__PURE__ */ jsx("button", {
							onClick: () => setIsMoonsOpen(false),
							title: "Collapse Moons Dock",
							"aria-label": "Collapse Moons Dock",
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								background: "rgba(255, 255, 255, 0.06)",
								border: "1px solid rgba(255, 255, 255, 0.12)",
								borderRadius: "50%",
								width: "24px",
								height: "24px",
								color: "#94a3b8",
								cursor: "pointer",
								transition: "all 0.15s ease",
								flexShrink: 0
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.color = "#ffffff";
								e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
								e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.color = "#94a3b8";
								e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
								e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
							},
							children: /* @__PURE__ */ jsx(ChevronDown, { size: 14 })
						})
					]
				})
			]
		}) : /* @__PURE__ */ jsxs("button", {
			onClick: () => setIsMoonsOpen(true),
			title: "Open Moons Dock",
			"aria-label": "Open Moons Dock",
			style: {
				pointerEvents: "auto",
				display: "flex",
				alignItems: "center",
				gap: "7px",
				background: "rgba(10, 16, 30, 0.85)",
				backdropFilter: "blur(16px)",
				WebkitBackdropFilter: "blur(16px)",
				border: "1px solid rgba(255, 255, 255, 0.22)",
				borderRadius: "24px",
				padding: "7px 16px",
				color: "#f8fafc",
				fontSize: "13px",
				fontWeight: 600,
				cursor: "pointer",
				boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(203, 213, 225, 0.15)",
				whiteSpace: "nowrap",
				fontFamily: "system-ui, -apple-system, sans-serif",
				transition: "all 0.18s ease"
			},
			onMouseEnter: (e) => {
				e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
				e.currentTarget.style.borderColor = "rgba(203, 213, 225, 0.6)";
				e.currentTarget.style.boxShadow = "0 10px 28px rgba(0, 0, 0, 0.7), 0 0 20px rgba(203, 213, 225, 0.25)";
			},
			onMouseLeave: (e) => {
				e.currentTarget.style.transform = "translateY(0) scale(1)";
				e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
				e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(203, 213, 225, 0.15)";
			},
			children: [
				/* @__PURE__ */ jsx("span", {
					style: { fontSize: "14px" },
					children: "🌕"
				}),
				/* @__PURE__ */ jsx("span", { children: "Moons" }),
				/* @__PURE__ */ jsx(ChevronUp, {
					size: 15,
					color: "#cbd5e1"
				})
			]
		}), isPlanetsOpen ? /* @__PURE__ */ jsxs("div", {
			style: {
				pointerEvents: "auto",
				display: "flex",
				alignItems: "center",
				gap: isMobile ? "4px" : "8px",
				background: "rgba(10, 16, 30, 0.88)",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				border: "1px solid rgba(255, 255, 255, 0.16)",
				borderRadius: "32px",
				padding: isMobile ? "5px 8px 5px 10px" : "8px 12px 8px 16px",
				boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55)",
				maxWidth: "100%",
				overflowX: "auto",
				scrollbarWidth: "none",
				WebkitOverflowScrolling: "touch",
				fontFamily: "system-ui, -apple-system, sans-serif",
				animation: "fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
			},
			children: [
				/* @__PURE__ */ jsxs("button", {
					onClick: clearSelection,
					title: "Full Solar System Overview",
					style: {
						background: selectedId === null ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.06)",
						border: selectedId === null ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
						borderRadius: "20px",
						padding: isMobile ? "4px 8px" : "6px 12px",
						color: selectedId === null ? "#38bdf8" : "#94a3b8",
						fontSize: isMobile ? "11px" : "12px",
						fontWeight: 600,
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						whiteSpace: "nowrap",
						flexShrink: 0,
						transition: "all 0.15s ease-out"
					},
					onMouseEnter: (e) => {
						e.currentTarget.style.color = "#38bdf8";
					},
					onMouseLeave: (e) => {
						if (selectedId !== null) e.currentTarget.style.color = "#94a3b8";
					},
					children: [/* @__PURE__ */ jsx(Eye, { size: isMobile ? 12 : 14 }), " Overview"]
				}),
				/* @__PURE__ */ jsx("div", { style: {
					width: "1px",
					height: "22px",
					background: "rgba(255, 255, 255, 0.16)",
					margin: "0 2px",
					flexShrink: 0
				} }),
				/* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: isMobile ? "4px" : "6px",
						overflowX: "auto",
						scrollbarWidth: "none",
						WebkitOverflowScrolling: "touch",
						flex: 1
					},
					children: [
						PLANET_DOCK_ITEMS.map((item) => {
							const isSelected = selectedId === item.id;
							return /* @__PURE__ */ jsxs("button", {
								"data-tutorial": item.id === "earth" ? "earth-button" : void 0,
								onClick: () => selectBody({
									id: item.id,
									name: item.name,
									radius: item.radius,
									type: item.id === "sun" ? "star" : "planet"
								}),
								title: `Fly to ${item.name}`,
								style: {
									background: isSelected ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
									border: isSelected ? `2px solid ${item.color}` : "1px solid rgba(255, 255, 255, 0.08)",
									borderRadius: "16px",
									padding: isMobile ? "4px 8px" : "6px 10px",
									display: "flex",
									alignItems: "center",
									gap: isMobile ? "4px" : "6px",
									color: isSelected ? "#ffffff" : "#cbd5e1",
									fontSize: isMobile ? "11px" : "12px",
									fontWeight: isSelected ? 600 : 400,
									cursor: "pointer",
									whiteSpace: "nowrap",
									flexShrink: 0,
									boxShadow: isSelected ? `0 0 14px ${item.color}55` : "none",
									transform: isSelected ? "scale(1.05)" : "scale(1.0)",
									transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
								},
								onMouseEnter: (e) => {
									e.currentTarget.style.transform = "scale(1.08)";
									e.currentTarget.style.borderColor = item.color;
								},
								onMouseLeave: (e) => {
									if (!isSelected) {
										e.currentTarget.style.transform = "scale(1.0)";
										e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
									}
								},
								children: [/* @__PURE__ */ jsx("span", { style: {
									width: "10px",
									height: "10px",
									borderRadius: "50%",
									background: item.color,
									boxShadow: `0 0 6px ${item.color}`,
									flexShrink: 0
								} }), /* @__PURE__ */ jsx("span", { children: item.name })]
							}, item.id);
						}),
						/* @__PURE__ */ jsx("div", { style: {
							width: "1px",
							height: "20px",
							background: "rgba(255, 255, 255, 0.15)",
							margin: "0 4px",
							flexShrink: 0
						} }),
						/* @__PURE__ */ jsxs("button", {
							onClick: () => captureSnapshot(),
							"data-tutorial": "photo-button",
							title: "Take Space Snapshot & Share",
							style: {
								display: "flex",
								alignItems: "center",
								gap: "6px",
								background: "linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.18))",
								border: "1px solid rgba(56, 189, 248, 0.38)",
								borderRadius: "20px",
								padding: "6px 13px",
								color: "#f8fafc",
								fontSize: "12px",
								fontWeight: 600,
								cursor: "pointer",
								transition: "all 0.15s ease",
								whiteSpace: "nowrap",
								flexShrink: 0
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.transform = "scale(1.05)";
								e.currentTarget.style.background = "linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(168, 85, 247, 0.35))";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.transform = "scale(1.0)";
								e.currentTarget.style.background = "linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.18))";
							},
							children: [
								/* @__PURE__ */ jsx(Camera, {
									size: 14,
									color: "#38bdf8"
								}),
								" ",
								!isMobile && "Photo"
							]
						}),
						/* @__PURE__ */ jsx("div", { style: {
							width: "1px",
							height: "20px",
							background: "rgba(255, 255, 255, 0.15)",
							margin: "0 4px",
							flexShrink: 0
						} }),
						/* @__PURE__ */ jsx("button", {
							onClick: () => setIsPlanetsOpen(false),
							title: "Collapse Planets Dock",
							"aria-label": "Collapse Planets Dock",
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								background: "rgba(255, 255, 255, 0.06)",
								border: "1px solid rgba(255, 255, 255, 0.12)",
								borderRadius: "50%",
								width: "26px",
								height: "26px",
								color: "#94a3b8",
								cursor: "pointer",
								transition: "all 0.15s ease",
								flexShrink: 0
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.color = "#ffffff";
								e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
								e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.color = "#94a3b8";
								e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
								e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
							},
							children: /* @__PURE__ */ jsx(ChevronDown, { size: 15 })
						})
					]
				})
			]
		}) : /* @__PURE__ */ jsxs("button", {
			onClick: () => setIsPlanetsOpen(true),
			title: "Open Planets Dock",
			"aria-label": "Open Planets Dock",
			style: {
				pointerEvents: "auto",
				display: "flex",
				alignItems: "center",
				gap: "7px",
				background: "rgba(10, 16, 30, 0.85)",
				backdropFilter: "blur(16px)",
				WebkitBackdropFilter: "blur(16px)",
				border: "1px solid rgba(255, 255, 255, 0.22)",
				borderRadius: "24px",
				padding: "7px 16px",
				color: "#f8fafc",
				fontSize: "13px",
				fontWeight: 600,
				cursor: "pointer",
				boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15)",
				whiteSpace: "nowrap",
				fontFamily: "system-ui, -apple-system, sans-serif",
				transition: "all 0.18s ease"
			},
			onMouseEnter: (e) => {
				e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
				e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.55)";
				e.currentTarget.style.boxShadow = "0 10px 28px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.25)";
			},
			onMouseLeave: (e) => {
				e.currentTarget.style.transform = "translateY(0) scale(1)";
				e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
				e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15)";
			},
			children: [
				/* @__PURE__ */ jsx("span", {
					style: { fontSize: "14px" },
					children: "🪐"
				}),
				/* @__PURE__ */ jsx("span", { children: "Planets" }),
				/* @__PURE__ */ jsx(ChevronUp, {
					size: 15,
					color: "#38bdf8"
				})
			]
		})]
	});
};
// src/science/eclipse.ts
/**
* High-Precision Eclipse Predictor Engine.
* 
* Leverages Astronomy Engine to calculate real-time Solar and Lunar eclipses,
* active eclipse states, and upcoming astronomical events.
*/
/**
* Searches and analyzes the closest solar and lunar eclipses relative to simulated time.
*/
function getEclipseReport(currentJde) {
	const currentDate = jdeToDate(currentJde);
	const searchStart = /* @__PURE__ */ new Date(currentDate.getTime() - 432e5);
	const solarRaw = Astronomy.SearchGlobalSolarEclipse(searchStart);
	const solarPeakDate = solarRaw.peak.date;
	const solarDiffHours = (solarPeakDate.getTime() - currentDate.getTime()) / 36e5;
	const solarDiffDays = solarDiffHours / 24;
	const isSolarActive = Math.abs(solarDiffHours) <= 2.5;
	let solarKindName = "Solar Eclipse";
	if (solarRaw.kind === "total") solarKindName = "Total Solar Eclipse";
	else if (solarRaw.kind === "annular") solarKindName = "Annular \"Ring of Fire\" Eclipse";
	else solarKindName = "Partial Solar Eclipse";
	const nextSolar = {
		id: `solar-${solarPeakDate.toISOString()}`,
		type: "solar",
		kind: solarRaw.kind,
		peakDate: solarPeakDate,
		peakJde: dateToJde(solarPeakDate),
		diffDays: Math.round(solarDiffDays * 10) / 10,
		diffHours: Math.round(solarDiffHours * 10) / 10,
		isActive: isSolarActive,
		label: solarKindName,
		description: isSolarActive ? "The Moon is passing directly between the Sun and Earth right now, casting its shadow onto the surface!" : `Next ${solarKindName} will peak on ${solarPeakDate.toLocaleDateString(void 0, {
			month: "short",
			day: "numeric",
			year: "numeric"
		})}.`,
		emoji: solarRaw.kind === "total" ? "🌑☀️" : "🌒",
		badgeColor: "#f59e0b"
	};
	const lunarRaw = Astronomy.SearchLunarEclipse(searchStart);
	const lunarPeakDate = lunarRaw.peak.date;
	const lunarDiffHours = (lunarPeakDate.getTime() - currentDate.getTime()) / 36e5;
	const lunarDiffDays = lunarDiffHours / 24;
	const lunarSemiDurationHours = (lunarRaw.sd_penum || 120) / 60;
	const isLunarActive = Math.abs(lunarDiffHours) <= lunarSemiDurationHours;
	let lunarKindName = "Lunar Eclipse";
	if (lunarRaw.kind === "total") lunarKindName = "Total \"Blood Moon\" Eclipse";
	else if (lunarRaw.kind === "partial") lunarKindName = "Partial Lunar Eclipse";
	else lunarKindName = "Penumbral Lunar Eclipse";
	const nextLunar = {
		id: `lunar-${lunarPeakDate.toISOString()}`,
		type: "lunar",
		kind: lunarRaw.kind,
		peakDate: lunarPeakDate,
		peakJde: dateToJde(lunarPeakDate),
		diffDays: Math.round(lunarDiffDays * 10) / 10,
		diffHours: Math.round(lunarDiffHours * 10) / 10,
		isActive: isLunarActive,
		label: lunarKindName,
		description: isLunarActive ? "Earth is passing directly between the Sun and Moon right now, casting Earth’s shadow onto the Moon!" : `Next ${lunarKindName} will peak on ${lunarPeakDate.toLocaleDateString(void 0, {
			month: "short",
			day: "numeric",
			year: "numeric"
		})}.`,
		emoji: lunarRaw.kind === "total" ? "🌕🔴" : "🌗",
		badgeColor: "#ef4444"
	};
	const activeEclipse = isSolarActive ? nextSolar : isLunarActive ? nextLunar : null;
	let upcomingEclipse = null;
	if (!activeEclipse) {
		if (solarDiffDays > 0 && solarDiffDays <= 30 && (lunarDiffDays <= 0 || solarDiffDays < lunarDiffDays)) upcomingEclipse = nextSolar;
		else if (lunarDiffDays > 0 && lunarDiffDays <= 30) upcomingEclipse = nextLunar;
	}
	return {
		activeEclipse,
		upcomingEclipse,
		nextSolar,
		nextLunar
	};
}
// src/components/ui/EclipseAlertBanner.tsx
var FAMOUS_ECLIPSES = [
	{
		name: "Great American Eclipse",
		dateStr: "2024-04-08T18:17:00Z",
		type: "Total Solar 🌑"
	},
	{
		name: "Upcoming European Eclipse",
		dateStr: "2026-08-12T17:47:00Z",
		type: "Total Solar 🌑"
	},
	{
		name: "Great American Eclipse 2017",
		dateStr: "2017-08-21T18:26:00Z",
		type: "Total Solar 🌑"
	},
	{
		name: "Blood Moon Eclipse",
		dateStr: "2025-03-14T06:59:00Z",
		type: "Total Lunar 🌕🔴"
	}
];
var EclipseAlertBanner = () => {
	const currentJde = useSimulationClock((state) => state.currentJde);
	const jumpToJde = useSimulationClock((state) => state.jumpToJde);
	const selectBody = useFocusStore((state) => state.selectBody);
	const isMobile = useIsMobile();
	const [isDismissed, setIsDismissed] = useState(false);
	const [showPresets, setShowPresets] = useState(false);
	const report = useMemo(() => {
		return getEclipseReport(currentJde);
	}, [Math.round(currentJde * 10)]);
	const targetEclipse = report.activeEclipse || report.upcomingEclipse;
	const handleJumpToPeak = (eclipse) => {
		jumpToJde(eclipse.peakJde);
		selectBody({
			id: "earth",
			name: "Earth",
			radius: 2.2,
			type: "planet"
		});
	};
	const handleJumpToPreset = (dateIso) => {
		const jde = dateToJde(new Date(dateIso));
		jumpToJde(jde);
		selectBody({
			id: "earth",
			name: "Earth",
			radius: 2.2,
			type: "planet"
		});
		setShowPresets(false);
	};
	if (!targetEclipse && !showPresets) return null;
	if (isDismissed && !targetEclipse?.isActive) return null;
	const isActive = targetEclipse?.isActive ?? false;
	return /* @__PURE__ */ jsx("div", {
		style: {
			position: "absolute",
			top: isMobile ? "64px" : "20px",
			left: isMobile ? "10px" : "360px",
			right: isMobile ? "10px" : "auto",
			zIndex: 45,
			fontFamily: "system-ui, -apple-system, sans-serif"
		},
		children: /* @__PURE__ */ jsxs("div", {
			style: {
				background: isActive ? "linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(15, 23, 42, 0.92))" : "linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(15, 23, 42, 0.88))",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				border: isActive ? "1.5px solid #f59e0b" : "1px solid rgba(56, 189, 248, 0.35)",
				borderRadius: "18px",
				padding: isMobile ? "8px 12px" : "10px 16px",
				color: "#ffffff",
				boxShadow: isActive ? "0 0 25px rgba(245, 158, 11, 0.4), 0 8px 32px rgba(0, 0, 0, 0.55)" : "0 8px 30px rgba(0, 0, 0, 0.45)",
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				animation: "fadeIn 0.3s ease-out forwards"
			},
			children: [/* @__PURE__ */ jsxs("div", {
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px"
				},
				children: [/* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "8px"
					},
					children: [/* @__PURE__ */ jsx("span", {
						style: { fontSize: isMobile ? "18px" : "22px" },
						children: targetEclipse?.emoji || "🌘"
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: isMobile ? "13px" : "14px",
							fontWeight: 700,
							color: isActive ? "#fef08a" : "#f8fafc",
							display: "flex",
							alignItems: "center",
							gap: "6px"
						},
						children: [/* @__PURE__ */ jsx("span", { children: targetEclipse?.label || "Eclipse Watch" }), isActive && /* @__PURE__ */ jsx("span", {
							style: {
								background: "#ef4444",
								color: "#ffffff",
								fontSize: "10px",
								fontWeight: 800,
								padding: "2px 6px",
								borderRadius: "8px",
								letterSpacing: "0.5px"
							},
							children: "LIVE"
						})]
					}), /* @__PURE__ */ jsx("div", {
						style: {
							fontSize: "11px",
							color: "#94a3b8"
						},
						children: isActive ? "Active Right Now! Sun, Moon & Earth aligned" : targetEclipse ? `Peaking in ${Math.ceil(targetEclipse.diffDays)} days (${targetEclipse.peakDate.toLocaleDateString(void 0, {
							month: "short",
							day: "numeric",
							year: "numeric"
						})})` : "Historical & Upcoming Eclipses"
					})] })]
				}), /* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "6px"
					},
					children: [
						targetEclipse && /* @__PURE__ */ jsxs("button", {
							onClick: () => handleJumpToPeak(targetEclipse),
							title: "Jump clock to peak eclipse alignment",
							style: {
								background: isActive ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(56, 189, 248, 0.22)",
								border: isActive ? "none" : "1px solid rgba(56, 189, 248, 0.45)",
								borderRadius: "12px",
								padding: "5px 10px",
								color: "#ffffff",
								fontSize: "12px",
								fontWeight: 600,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px",
								transition: "all 0.15s ease",
								whiteSpace: "nowrap"
							},
							children: [/* @__PURE__ */ jsx("span", { children: isActive ? "View Alignment" : "Jump to Peak" }), /* @__PURE__ */ jsx(ArrowRight, { size: 13 })]
						}),
						/* @__PURE__ */ jsxs("button", {
							onClick: () => setShowPresets(!showPresets),
							title: "Browse famous eclipses",
							style: {
								background: "rgba(255, 255, 255, 0.08)",
								border: "none",
								borderRadius: "12px",
								padding: "5px 8px",
								color: "#cbd5e1",
								fontSize: "11px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "2px"
							},
							children: [/* @__PURE__ */ jsx(Calendar, { size: 13 }), /* @__PURE__ */ jsx(ChevronDown, { size: 11 })]
						}),
						!isActive && /* @__PURE__ */ jsx("button", {
							onClick: () => setIsDismissed(true),
							title: "Dismiss banner",
							style: {
								background: "transparent",
								border: "none",
								color: "#94a3b8",
								cursor: "pointer",
								padding: "4px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center"
							},
							children: /* @__PURE__ */ jsx(X, { size: 15 })
						})
					]
				})]
			}), showPresets && /* @__PURE__ */ jsxs("div", {
				style: {
					marginTop: "6px",
					paddingTop: "8px",
					borderTop: "1px solid rgba(255, 255, 255, 0.1)",
					display: "flex",
					flexDirection: "column",
					gap: "4px"
				},
				children: [/* @__PURE__ */ jsx("div", {
					style: {
						fontSize: "11px",
						color: "#94a3b8",
						fontWeight: 600
					},
					children: "Famous Solar & Lunar Eclipses:"
				}), /* @__PURE__ */ jsx("div", {
					style: {
						display: "grid",
						gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
						gap: "6px"
					},
					children: FAMOUS_ECLIPSES.map((item) => /* @__PURE__ */ jsxs("button", {
						onClick: () => handleJumpToPreset(item.dateStr),
						style: {
							background: "rgba(255, 255, 255, 0.06)",
							border: "1px solid rgba(255, 255, 255, 0.12)",
							borderRadius: "10px",
							padding: "6px 10px",
							color: "#f8fafc",
							fontSize: "11px",
							textAlign: "left",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between"
						},
						onMouseEnter: (e) => {
							e.currentTarget.style.background = "rgba(56, 189, 248, 0.2)";
						},
						onMouseLeave: (e) => {
							e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
						},
						children: [/* @__PURE__ */ jsx("span", {
							style: { fontWeight: 600 },
							children: item.name
						}), /* @__PURE__ */ jsx("span", {
							style: {
								color: "#38bdf8",
								fontSize: "10px"
							},
							children: item.type
						})]
					}, item.name))
				})]
			})]
		})
	});
};
// src/components/ui/NeoRadarBanner.tsx
var NeoRadarBanner = () => {
	const asteroids = useAsteroidStore((state) => state.asteroids);
	const activeAlert = useAsteroidStore((state) => state.activeAlert);
	const setActiveAlert = useAsteroidStore((state) => state.setActiveAlert);
	const selectBody = useFocusStore((state) => state.selectBody);
	const jumpToJde = useSimulationClock((state) => state.jumpToJde);
	const isMobile = useIsMobile();
	const [isDismissed, setIsDismissed] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const featuredAsteroid = activeAlert || (asteroids.length > 0 ? asteroids[0] : null);
	useEffect(() => {
		if (activeAlert) setIsDismissed(false);
	}, [activeAlert]);
	if (!featuredAsteroid || isDismissed) return null;
	const isHazard = featuredAsteroid.isPotentiallyHazardous;
	const accentColor = isHazard ? "#f59e0b" : "#38bdf8";
	const handleJumpToFlyby = () => {
		const jde = dateToJde(new Date(featuredAsteroid.epochDateCloseApproach));
		jumpToJde(jde);
	};
	const handleFocusAsteroid = () => {
		selectBody({
			id: featuredAsteroid.id,
			name: featuredAsteroid.name,
			radius: .35,
			type: "asteroid"
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		style: {
			position: "absolute",
			top: isMobile ? "124px" : "106px",
			left: isMobile ? "10px" : "20px",
			zIndex: 42,
			maxWidth: isMobile ? "calc(100vw - 20px)" : "320px",
			background: "rgba(10, 16, 32, 0.90)",
			backdropFilter: "blur(16px)",
			WebkitBackdropFilter: "blur(16px)",
			border: `1.5px solid ${accentColor}66`,
			borderRadius: "16px",
			padding: isMobile ? "8px 12px" : "10px 14px",
			boxShadow: `0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px ${accentColor}22`,
			color: "#ffffff",
			fontFamily: "system-ui, -apple-system, sans-serif",
			animation: "slideInTop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
		},
		children: [
			/* @__PURE__ */ jsxs("div", {
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px"
				},
				children: [/* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "7px"
					},
					children: [
						/* @__PURE__ */ jsx(ShieldAlert, {
							size: 16,
							color: accentColor,
							style: { flexShrink: 0 }
						}),
						/* @__PURE__ */ jsx("span", {
							style: {
								fontSize: "11px",
								fontWeight: 700,
								color: accentColor,
								letterSpacing: "0.6px",
								textTransform: "uppercase"
							},
							children: "Near-Earth Asteroid Radar"
						}),
						activeAlert && /* @__PURE__ */ jsx("span", {
							style: {
								fontSize: "9px",
								fontWeight: 700,
								background: "#ef4444",
								color: "#ffffff",
								padding: "1px 5px",
								borderRadius: "9999px",
								textTransform: "uppercase"
							},
							children: "LIVE"
						})
					]
				}), /* @__PURE__ */ jsx("button", {
					onClick: () => {
						setIsDismissed(true);
						setActiveAlert(null);
					},
					title: "Dismiss banner",
					style: {
						background: "none",
						border: "none",
						color: "#94a3b8",
						cursor: "pointer",
						padding: "2px",
						display: "flex",
						alignItems: "center"
					},
					children: /* @__PURE__ */ jsx(X, { size: 14 })
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				style: { marginTop: "6px" },
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "baseline",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "14px",
								fontWeight: 700,
								color: "#f8fafc"
							},
							children: ["🪨 ", featuredAsteroid.name]
						}), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "11px",
								fontWeight: 600,
								color: "#38bdf8"
							},
							children: [featuredAsteroid.missDistanceLunar.toFixed(2), " LD"]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "11.5px",
							color: "#cbd5e1",
							marginTop: "2px",
							lineHeight: 1.4
						},
						children: ["Passes Earth at ", formatMissDistance(featuredAsteroid.missDistanceLunar, featuredAsteroid.missDistanceKm)]
					}),
					isExpanded && /* @__PURE__ */ jsxs("div", {
						style: {
							marginTop: "8px",
							paddingTop: "8px",
							borderTop: "1px solid rgba(255, 255, 255, 0.08)",
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "6px",
							fontSize: "11px"
						},
						children: [
							/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("span", {
									style: { color: "#94a3b8" },
									children: "Est. Diameter:"
								}),
								" ",
								/* @__PURE__ */ jsxs("strong", {
									style: { color: "#f8fafc" },
									children: [
										"~",
										featuredAsteroid.diameterMeters.avg,
										" m"
									]
								})
							] }),
							/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("span", {
									style: { color: "#94a3b8" },
									children: "Flyby Speed:"
								}),
								" ",
								/* @__PURE__ */ jsxs("strong", {
									style: { color: "#f8fafc" },
									children: [featuredAsteroid.relativeVelocityKmS, " km/s"]
								})
							] }),
							/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("span", {
									style: { color: "#94a3b8" },
									children: "Flyby Date:"
								}),
								" ",
								/* @__PURE__ */ jsx("strong", {
									style: { color: "#f8fafc" },
									children: featuredAsteroid.closeApproachDate
								})
							] }),
							/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("span", {
									style: { color: "#94a3b8" },
									children: "Hazard:"
								}),
								" ",
								/* @__PURE__ */ jsx("strong", {
									style: { color: isHazard ? "#f59e0b" : "#4ade80" },
									children: isHazard ? "Hazardous" : "Safe"
								})
							] })
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: "6px",
					marginTop: "8px"
				},
				children: [
					/* @__PURE__ */ jsxs("button", {
						onClick: handleFocusAsteroid,
						style: {
							flex: 1,
							background: "rgba(56, 189, 248, 0.2)",
							border: "1px solid rgba(56, 189, 248, 0.45)",
							borderRadius: "10px",
							padding: "5px 8px",
							color: "#ffffff",
							fontSize: "11px",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							cursor: "pointer",
							transition: "background 0.15s ease"
						},
						children: [/* @__PURE__ */ jsx(Eye, {
							size: 12,
							color: "#38bdf8"
						}), " Inspect in 3D"]
					}),
					/* @__PURE__ */ jsxs("button", {
						onClick: handleJumpToFlyby,
						title: `Jump to ${featuredAsteroid.closeApproachDateFull}`,
						style: {
							flex: 1,
							background: "rgba(245, 158, 11, 0.18)",
							border: "1px solid rgba(245, 158, 11, 0.45)",
							borderRadius: "10px",
							padding: "5px 8px",
							color: "#fbbf24",
							fontSize: "11px",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							cursor: "pointer",
							transition: "background 0.15s ease"
						},
						children: [/* @__PURE__ */ jsx(Calendar, {
							size: 12,
							color: "#fbbf24"
						}), " Jump to Flyby"]
					}),
					/* @__PURE__ */ jsx("button", {
						onClick: () => setIsExpanded((prev) => !prev),
						title: isExpanded ? "Collapse specs" : "Expand specs",
						style: {
							background: "rgba(255, 255, 255, 0.08)",
							border: "1px solid rgba(255, 255, 255, 0.14)",
							borderRadius: "10px",
							width: "28px",
							height: "28px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#cbd5e1",
							cursor: "pointer",
							transform: isExpanded ? "rotate(90deg)" : "none",
							transition: "transform 0.15s ease"
						},
						children: /* @__PURE__ */ jsx(ChevronRight, { size: 14 })
					})
				]
			})
		]
	});
};
// src/science/topocentricCoordinates.ts
/**
* Topocentric Astrometry & Ground Observer Coordinates.
* 
* Computes real-time horizontal coordinates (Altitude and Azimuth) from any
* observer location on Earth for the Sun, Moon, and bright visible planets.
* Combines Astronomy Engine (high-precision astrometry) and SunCalc (solar times).
*/
var PRESET_LOCATIONS = [
	{
		id: "nyc",
		name: "New York City",
		region: "New York",
		country: "United States",
		flagEmoji: "🇺🇸",
		latitude: 40.7128,
		longitude: -74.006,
		elevationMeters: 10,
		description: "Mid-latitude Northern Hemisphere urban sky"
	},
	{
		id: "london",
		name: "London",
		region: "England",
		country: "United Kingdom",
		flagEmoji: "🇬🇧",
		latitude: 51.5074,
		longitude: -.1278,
		elevationMeters: 15,
		description: "Historical home of Greenwich Mean Time & Prime Meridian"
	},
	{
		id: "tokyo",
		name: "Tokyo",
		region: "Kantō",
		country: "Japan",
		flagEmoji: "🇯🇵",
		latitude: 35.6762,
		longitude: 139.6503,
		elevationMeters: 40,
		description: "Eastern Asia metropolis night sky"
	},
	{
		id: "sydney",
		name: "Sydney",
		region: "New South Wales",
		country: "Australia",
		flagEmoji: "🇦🇺",
		latitude: -33.8688,
		longitude: 151.2093,
		elevationMeters: 25,
		description: "Iconic Southern Hemisphere sky showcasing Southern Cross & Magellanic Clouds"
	},
	{
		id: "cairo",
		name: "Cairo",
		region: "Giza",
		country: "Egypt",
		flagEmoji: "🇪🇬",
		latitude: 30.0444,
		longitude: 31.2357,
		elevationMeters: 75,
		description: "Ancient cradle of solar & stellar alignment astronomy"
	},
	{
		id: "honolulu",
		name: "Honolulu",
		region: "Hawaii",
		country: "United States",
		flagEmoji: "🌺",
		latitude: 21.3069,
		longitude: -157.8583,
		elevationMeters: 6,
		description: "Tropical Polynesian wayfinding sky with zenith star passes"
	},
	{
		id: "tromso",
		name: "Tromsø",
		region: "Troms",
		country: "Norway",
		flagEmoji: "🇳🇴",
		latitude: 69.6492,
		longitude: 18.9553,
		elevationMeters: 30,
		description: "Arctic Circle experiencing Midnight Sun in June and Polar Night in December"
	},
	{
		id: "atacama",
		name: "Atacama Desert",
		region: "Antofagasta",
		country: "Chile",
		flagEmoji: "🇨🇱",
		latitude: -23.8634,
		longitude: -69.1328,
		elevationMeters: 2400,
		description: "World’s premier ultra-clear high-altitude astronomical observatory site"
	}
];
var COMPASS_POINTS = [
	"N",
	"NNE",
	"NE",
	"ENE",
	"E",
	"ESE",
	"SE",
	"SSE",
	"S",
	"SSW",
	"SW",
	"WSW",
	"W",
	"WNW",
	"NW",
	"NNW"
];
/**
* Converts an azimuth angle (0..360°) into a 16-wind compass abbreviation.
*/
function getCompassDirection(azimuthDeg) {
	const normalized = (azimuthDeg % 360 + 360) % 360;
	return COMPASS_POINTS[Math.round(normalized / 22.5) % 16];
}
/**
* Maps topocentric spherical coordinates (Altitude, Azimuth) to 3D Cartesian scene coordinates.
* 
* Orientation convention:
* - Up (+Y): Zenith (straight up, altitude = +90°)
* - Down (-Y): Nadir (ground center, altitude = -90°)
* - Forward (-Z): North (azimuth = 0°)
* - Right (+X): East (azimuth = 90°, where celestial bodies rise)
* - Back (+Z): South (azimuth = 180°)
* - Left (-X): West (azimuth = 270°, where celestial bodies set)
*/
function topocentricToCartesian(altitudeDeg, azimuthDeg, radius = 80) {
	const altRad = altitudeDeg * Math.PI / 180;
	const azRad = azimuthDeg * Math.PI / 180;
	const y = radius * Math.sin(altRad);
	const rHoriz = radius * Math.cos(altRad);
	return [
		rHoriz * Math.sin(azRad),
		y,
		-rHoriz * Math.cos(azRad)
	];
}
/**
* Computes the lighting phase and color palette of the local sky based on
* the instantaneous altitude of the Sun.
*/
function getSkyAtmosphereState(date, location) {
	const sunPos = SunCalc.getPosition(date, location.latitude, location.longitude);
	const sunAlt = sunPos.altitude;
	const sunAz = sunPos.azimuth;
	let phase;
	let phaseLabel;
	let zenithColor;
	let horizonColor;
	let groundColor;
	let sunGlareColor;
	let ambientLightIntensity;
	let directionalLightIntensity;
	let starsOpacity;
	if (sunAlt > 6) {
		phase = "day";
		phaseLabel = "Daylight";
		zenithColor = "#1d4ed8";
		horizonColor = "#93c5fd";
		groundColor = "#1e3a1e";
		sunGlareColor = "#fef08a";
		ambientLightIntensity = 1;
		directionalLightIntensity = 1.2;
		starsOpacity = 0;
	} else if (sunAlt >= 0 && sunAlt <= 6) {
		phase = "golden_hour";
		phaseLabel = "Golden Hour";
		zenithColor = "#2563eb";
		horizonColor = "#f59e0b";
		groundColor = "#3b2512";
		sunGlareColor = "#fef08a";
		ambientLightIntensity = .75;
		directionalLightIntensity = .95;
		starsOpacity = .08;
	} else if (sunAlt >= -4 && sunAlt < 0) {
		phase = "sunset_dusk";
		phaseLabel = "Sunset / Dusk";
		zenithColor = "#312e81";
		horizonColor = "#ea580c";
		groundColor = "#1c1917";
		sunGlareColor = "#f97316";
		ambientLightIntensity = .45;
		directionalLightIntensity = .55;
		starsOpacity = .25;
	} else if (sunAlt >= -6 && sunAlt < -4) {
		phase = "civil_twilight";
		phaseLabel = "Civil Twilight";
		zenithColor = "#1e1b4b";
		horizonColor = "#a855f7";
		groundColor = "#0f172a";
		sunGlareColor = "#d946ef";
		ambientLightIntensity = .25;
		directionalLightIntensity = .25;
		starsOpacity = .55;
	} else if (sunAlt >= -12 && sunAlt < -6) {
		phase = "nautical_twilight";
		phaseLabel = "Nautical Twilight";
		zenithColor = "#0f172a";
		horizonColor = "#3b0764";
		groundColor = "#090d16";
		sunGlareColor = "#818cf8";
		ambientLightIntensity = .12;
		directionalLightIntensity = .1;
		starsOpacity = .85;
	} else if (sunAlt >= -18 && sunAlt < -12) {
		phase = "astronomical_twilight";
		phaseLabel = "Astronomical Twilight";
		zenithColor = "#020617";
		horizonColor = "#1e1b4b";
		groundColor = "#030712";
		sunGlareColor = "#6366f1";
		ambientLightIntensity = .05;
		directionalLightIntensity = .04;
		starsOpacity = .95;
	} else {
		phase = "night";
		phaseLabel = "Night";
		zenithColor = "#010409";
		horizonColor = "#030712";
		groundColor = "#020408";
		sunGlareColor = "#38bdf8";
		ambientLightIntensity = .03;
		directionalLightIntensity = .02;
		starsOpacity = 1;
	}
	return {
		phase,
		phaseLabel,
		sunAltitudeDeg: sunAlt,
		sunAzimuthDeg: sunAz,
		zenithColor,
		horizonColor,
		groundColor,
		sunGlareColor,
		ambientLightIntensity,
		directionalLightIntensity,
		starsOpacity
	};
}
function getLocalSunTimes(date, location) {
	const times = SunCalc.getTimes(date, location.latitude, location.longitude);
	return {
		sunrise: times.sunrise && !isNaN(times.sunrise.getTime()) ? times.sunrise : null,
		sunset: times.sunset && !isNaN(times.sunset.getTime()) ? times.sunset : null,
		solarNoon: times.solarNoon && !isNaN(times.solarNoon.getTime()) ? times.solarNoon : null,
		dawn: times.dawn && !isNaN(times.dawn.getTime()) ? times.dawn : null,
		dusk: times.dusk && !isNaN(times.dusk.getTime()) ? times.dusk : null,
		goldenHour: times.goldenHour && !isNaN(times.goldenHour.getTime()) ? times.goldenHour : null
	};
}
var TRACKED_PLANETS = [
	{
		id: "mercury",
		name: "Mercury",
		body: Astronomy.Body.Mercury,
		emoji: "☿️",
		colorHex: "#94a3b8"
	},
	{
		id: "venus",
		name: "Venus",
		body: Astronomy.Body.Venus,
		emoji: "♀️",
		colorHex: "#fef08a"
	},
	{
		id: "mars",
		name: "Mars",
		body: Astronomy.Body.Mars,
		emoji: "♂️",
		colorHex: "#ef4444"
	},
	{
		id: "jupiter",
		name: "Jupiter",
		body: Astronomy.Body.Jupiter,
		emoji: "♃",
		colorHex: "#f59e0b"
	},
	{
		id: "saturn",
		name: "Saturn",
		body: Astronomy.Body.Saturn,
		emoji: "♄",
		colorHex: "#eab308"
	}
];
function generateViewingTip(name, alt, az, compass, sunAlt) {
	if (alt <= 0) return `${name} is currently below the horizon.`;
	const isDusk = sunAlt >= -12 && sunAlt <= 2;
	if (sunAlt > 2 && name !== "Venus") return `${name} is in the daytime sky, obscured by bright sunlight.`;
	if (alt >= 45) return `High overhead in the ${compass} sky—optimal telescope seeing!`;
	if (alt >= 15) {
		if (isDusk && az > 200 && az < 330) return `Brilliant "Evening Star" setting in the western twilight.`;
		if (isDusk && az > 30 && az < 150) return `Rising in the eastern sky as twilight fades into darkness.`;
		return `Clearly visible at ${Math.round(alt)}° elevation towards the ${compass}.`;
	}
	return `Low on the ${compass} horizon (${Math.round(alt)}°). Look for an unobstructed viewpoint.`;
}
/**
* Computes real-time topocentric Altitude and Azimuth for the bright naked-eye planets.
*/
function getLocalPlanets(date, location, domeRadius = 80) {
	const obs = new Astronomy.Observer(location.latitude, location.longitude, location.elevationMeters || 10);
	const sunAlt = SunCalc.getPosition(date, location.latitude, location.longitude).altitude;
	return TRACKED_PLANETS.map((planet) => {
		const equ = Astronomy.Equator(planet.body, date, obs, true, true);
		const hor = Astronomy.Horizon(date, obs, equ.ra, equ.dec, "normal");
		const alt = hor.altitude;
		const az = hor.azimuth;
		const compass = getCompassDirection(az);
		const cartesian = topocentricToCartesian(alt, az, domeRadius);
		let mag = 0;
		try {
			const illum = Astronomy.Illumination(planet.body, date);
			mag = Math.round(illum.mag * 10) / 10;
		} catch {
			mag = 1;
		}
		const isAboveHorizon = alt > 0;
		const isVisibleNow = isAboveHorizon && (sunAlt < 0 || planet.id === "venus" && mag < -4);
		return {
			id: planet.id,
			name: planet.name,
			emoji: planet.emoji,
			colorHex: planet.colorHex,
			altitudeDeg: Math.round(alt * 10) / 10,
			azimuthDeg: Math.round(az * 10) / 10,
			compassDirection: compass,
			isAboveHorizon,
			cartesian,
			visualMagnitude: mag,
			isVisibleNow,
			viewingTip: generateViewingTip(planet.name, alt, az, compass, sunAlt)
		};
	});
}
/**
* Computes topocentric position for the Sun.
*/
function getLocalSun(date, location, domeRadius = 80) {
	const sunPos = SunCalc.getPosition(date, location.latitude, location.longitude);
	const alt = Math.round(sunPos.altitude * 10) / 10;
	const az = Math.round(sunPos.azimuth * 10) / 10;
	const compass = getCompassDirection(az);
	const cartesian = topocentricToCartesian(alt, az, domeRadius);
	return {
		id: "sun",
		name: "Sun",
		emoji: "☀️",
		colorHex: "#fbbf24",
		altitudeDeg: alt,
		azimuthDeg: az,
		compassDirection: compass,
		isAboveHorizon: alt > 0,
		cartesian,
		visualMagnitude: -26.7,
		isVisibleNow: alt > 0,
		viewingTip: alt > 0 ? `Sun is shining at ${alt}° above the ${compass} horizon.` : `Sun is currently ${Math.abs(alt)}° below the horizon.`
	};
}
/**
* Computes topocentric position for Earth's Moon.
*/
function getLocalMoon(date, location, domeRadius = 80) {
	const obs = new Astronomy.Observer(location.latitude, location.longitude, location.elevationMeters || 10);
	const equ = Astronomy.Equator(Astronomy.Body.Moon, date, obs, true, true);
	const hor = Astronomy.Horizon(date, obs, equ.ra, equ.dec, "normal");
	const alt = Math.round(hor.altitude * 10) / 10;
	const az = Math.round(hor.azimuth * 10) / 10;
	const compass = getCompassDirection(az);
	const cartesian = topocentricToCartesian(alt, az, domeRadius);
	let mag = -12;
	try {
		const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
		mag = Math.round(illum.mag * 10) / 10;
	} catch {
		mag = -12;
	}
	const isAboveHorizon = alt > 0;
	return {
		id: "moon",
		name: "Moon",
		emoji: "🌕",
		colorHex: "#e2e8f0",
		altitudeDeg: alt,
		azimuthDeg: az,
		compassDirection: compass,
		isAboveHorizon,
		cartesian,
		visualMagnitude: mag,
		isVisibleNow: isAboveHorizon,
		viewingTip: isAboveHorizon ? `Moon is shining brightly at ${alt}° elevation toward ${compass}.` : `Moon is currently below the local horizon.`
	};
}
// src/state/useGroundObserverStore.ts
var useGroundObserverStore = create((set) => ({
	viewMode: "space",
	location: PRESET_LOCATIONS[0],
	showCompassRing: true,
	showCardinalLabels: true,
	showPlanetMarkers: true,
	showAltAzGrid: false,
	isCompassExpanded: false,
	setViewMode: (viewMode) => set({ viewMode }),
	toggleViewMode: () => set((state) => ({ viewMode: state.viewMode === "space" ? "ground" : "space" })),
	setLocation: (location) => set({ location }),
	setCustomLocation: (name, latitude, longitude, country = "Custom") => set({ location: {
		id: "custom",
		name,
		region: "User Defined",
		country,
		flagEmoji: "📍",
		latitude,
		longitude,
		description: `Custom observer location (${latitude >= 0 ? `${latitude.toFixed(2)}°N` : `${Math.abs(latitude).toFixed(2)}°S`}, ${longitude >= 0 ? `${longitude.toFixed(2)}°E` : `${Math.abs(longitude).toFixed(2)}°W`})`
	} }),
	setShowCompassRing: (showCompassRing) => set({ showCompassRing }),
	setShowCardinalLabels: (showCardinalLabels) => set({ showCardinalLabels }),
	setShowPlanetMarkers: (showPlanetMarkers) => set({ showPlanetMarkers }),
	setShowAltAzGrid: (showAltAzGrid) => set({ showAltAzGrid }),
	setIsCompassExpanded: (isCompassExpanded) => set({ isCompassExpanded })
}));
// src/components/ui/LocalSkyCard.tsx
function formatTime(date) {
	if (!date || isNaN(date.getTime())) return "--:--";
	return date.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	});
}
var LocalSkyCard = () => {
	const viewMode = useGroundObserverStore((state) => state.viewMode);
	const location = useGroundObserverStore((state) => state.location);
	const setLocation = useGroundObserverStore((state) => state.setLocation);
	const toggleViewMode = useGroundObserverStore((state) => state.toggleViewMode);
	const isMobile = useIsMobile();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [showCityPicker, setShowCityPicker] = useState(false);
	const simDate = jdeToDate(useSimulationClock((state) => state.currentJde));
	if (viewMode !== "ground") return null;
	const atmosphere = getSkyAtmosphereState(simDate, location);
	const sunTimes = getLocalSunTimes(simDate, location);
	const planets = getLocalPlanets(simDate, location);
	const moon = getLocalMoon(simDate, location);
	const sun = getLocalSun(simDate, location);
	const visiblePlanets = planets.filter((p) => p.isAboveHorizon);
	const visibleBodies = [];
	if (sun.isAboveHorizon) visibleBodies.push(sun);
	if (moon.isAboveHorizon) visibleBodies.push(moon);
	visibleBodies.push(...visiblePlanets);
	const phaseColor = {
		day: "#38bdf8",
		golden_hour: "#f59e0b",
		sunset_dusk: "#ea580c",
		civil_twilight: "#c026d3",
		nautical_twilight: "#818cf8",
		astronomical_twilight: "#6366f1",
		night: "#38bdf8"
	}[atmosphere.phase] || "#38bdf8";
	return /* @__PURE__ */ jsxs("div", {
		style: {
			position: "absolute",
			top: isMobile ? "64px" : "20px",
			right: isMobile ? "10px" : "20px",
			zIndex: 42,
			width: isMobile ? "calc(100vw - 20px)" : "320px",
			maxHeight: isMobile ? "calc(100vh - 180px)" : "80vh",
			overflowY: "auto",
			background: "rgba(10, 16, 32, 0.92)",
			backdropFilter: "blur(20px)",
			WebkitBackdropFilter: "blur(20px)",
			border: "1.5px solid rgba(74, 222, 128, 0.4)",
			borderRadius: "18px",
			boxShadow: "0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(74, 222, 128, 0.15)",
			color: "#ffffff",
			fontFamily: "system-ui, -apple-system, sans-serif",
			animation: "slideInTop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
		},
		children: [
			/* @__PURE__ */ jsxs("div", {
				style: {
					padding: "12px 14px",
					borderBottom: isCollapsed ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						onClick: () => setShowCityPicker((prev) => !prev),
						style: {
							display: "flex",
							alignItems: "center",
							gap: "8px",
							cursor: "pointer",
							flex: 1,
							minWidth: 0
						},
						title: "Click to change observer city",
						children: [/* @__PURE__ */ jsx("span", {
							style: { fontSize: "18px" },
							children: location.flagEmoji
						}), /* @__PURE__ */ jsxs("div", {
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "13px",
									fontWeight: 700,
									color: "#f8fafc",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
									display: "flex",
									alignItems: "center",
									gap: "4px"
								},
								children: [location.name, /* @__PURE__ */ jsx(ChevronDown, {
									size: 13,
									color: "#94a3b8"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "10px",
									color: "#94a3b8"
								},
								children: [
									location.latitude >= 0 ? `${location.latitude.toFixed(1)}°N` : `${Math.abs(location.latitude).toFixed(1)}°S`,
									",",
									" ",
									location.longitude >= 0 ? `${location.longitude.toFixed(1)}°E` : `${Math.abs(location.longitude).toFixed(1)}°W`
								]
							})]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: "4px",
							background: `${phaseColor}20`,
							border: `1px solid ${phaseColor}55`,
							borderRadius: "9999px",
							padding: "3px 8px",
							fontSize: "10.5px",
							fontWeight: 700,
							color: phaseColor,
							whiteSpace: "nowrap"
						},
						children: atmosphere.phaseLabel
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: "4px"
						},
						children: [/* @__PURE__ */ jsx("button", {
							onClick: () => setIsCollapsed((prev) => !prev),
							title: isCollapsed ? "Expand observer sheet" : "Collapse observer sheet",
							style: {
								background: "rgba(255, 255, 255, 0.08)",
								border: "none",
								borderRadius: "8px",
								width: "26px",
								height: "26px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#cbd5e1",
								cursor: "pointer"
							},
							children: isCollapsed ? /* @__PURE__ */ jsx(ChevronDown, { size: 14 }) : /* @__PURE__ */ jsx(ChevronUp, { size: 14 })
						}), /* @__PURE__ */ jsx("button", {
							onClick: toggleViewMode,
							title: "Return to Space Orbit",
							style: {
								background: "rgba(56, 189, 248, 0.18)",
								border: "1px solid rgba(56, 189, 248, 0.4)",
								borderRadius: "8px",
								width: "26px",
								height: "26px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#38bdf8",
								cursor: "pointer"
							},
							children: /* @__PURE__ */ jsx(X, { size: 14 })
						})]
					})
				]
			}),
			showCityPicker && /* @__PURE__ */ jsx("div", {
				style: {
					padding: "10px 14px",
					background: "rgba(15, 23, 42, 0.95)",
					borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "5px"
				},
				children: PRESET_LOCATIONS.map((preset) => {
					const isSelected = location.id === preset.id;
					return /* @__PURE__ */ jsxs("button", {
						onClick: () => {
							setLocation(preset);
							setShowCityPicker(false);
						},
						style: {
							background: isSelected ? "rgba(74, 222, 128, 0.22)" : "rgba(255, 255, 255, 0.05)",
							border: isSelected ? "1px solid #4ade80" : "1px solid rgba(255, 255, 255, 0.08)",
							borderRadius: "8px",
							padding: "5px 8px",
							color: isSelected ? "#4ade80" : "#cbd5e1",
							fontSize: "11px",
							fontWeight: 600,
							cursor: "pointer",
							textAlign: "left",
							display: "flex",
							alignItems: "center",
							gap: "6px"
						},
						children: [/* @__PURE__ */ jsx("span", { children: preset.flagEmoji }), /* @__PURE__ */ jsx("span", {
							style: {
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: preset.name
						})]
					}, preset.id);
				})
			}),
			!isCollapsed && /* @__PURE__ */ jsxs("div", {
				style: {
					padding: "12px 14px",
					display: "flex",
					flexDirection: "column",
					gap: "12px"
				},
				children: [
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr 1fr",
							gap: "6px",
							background: "rgba(255, 255, 255, 0.03)",
							borderRadius: "12px",
							padding: "8px",
							border: "1px solid rgba(255, 255, 255, 0.06)"
						},
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "9.5px",
									color: "#94a3b8",
									display: "flex",
									alignItems: "center",
									gap: "3px"
								},
								children: [/* @__PURE__ */ jsx(Sunrise, {
									size: 11,
									color: "#f59e0b"
								}), " Sunrise"]
							}), /* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "12px",
									fontWeight: 700,
									color: "#f8fafc",
									marginTop: "2px"
								},
								children: formatTime(sunTimes.sunrise)
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "9.5px",
									color: "#94a3b8",
									display: "flex",
									alignItems: "center",
									gap: "3px"
								},
								children: [/* @__PURE__ */ jsx(Sun, {
									size: 11,
									color: "#fef08a"
								}), " Solar Noon"]
							}), /* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "12px",
									fontWeight: 700,
									color: "#f8fafc",
									marginTop: "2px"
								},
								children: formatTime(sunTimes.solarNoon)
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
								style: {
									fontSize: "9.5px",
									color: "#94a3b8",
									display: "flex",
									alignItems: "center",
									gap: "3px"
								},
								children: [/* @__PURE__ */ jsx(Sunset, {
									size: 11,
									color: "#ea580c"
								}), " Sunset"]
							}), /* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "12px",
									fontWeight: 700,
									color: "#f8fafc",
									marginTop: "2px"
								},
								children: formatTime(sunTimes.sunset)
							})] })
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							fontSize: "11px"
						},
						children: [/* @__PURE__ */ jsxs("span", {
							style: {
								color: "#94a3b8",
								display: "flex",
								alignItems: "center",
								gap: "4px"
							},
							children: [/* @__PURE__ */ jsx(Compass, {
								size: 12,
								color: "#38bdf8"
							}), " Solar Elevation:"]
						}), /* @__PURE__ */ jsxs("span", {
							style: {
								fontWeight: 700,
								color: atmosphere.sunAltitudeDeg > 0 ? "#fef08a" : "#94a3b8"
							},
							children: [
								atmosphere.sunAltitudeDeg.toFixed(1),
								"° (",
								atmosphere.sunAltitudeDeg > 0 ? "Above horizon" : "Below horizon",
								")"
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "11px",
							fontWeight: 700,
							color: "#38bdf8",
							letterSpacing: "0.4px",
							textTransform: "uppercase",
							marginBottom: "8px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ jsx("span", { children: "Tonight's Sky: Visible Worlds" }), /* @__PURE__ */ jsxs("span", {
							style: {
								fontSize: "9.5px",
								background: "rgba(56, 189, 248, 0.2)",
								color: "#38bdf8",
								padding: "1px 6px",
								borderRadius: "9999px"
							},
							children: [visibleBodies.length, " in sky"]
						})]
					}), visibleBodies.length === 0 ? /* @__PURE__ */ jsx("div", {
						style: {
							fontSize: "11px",
							color: "#94a3b8",
							background: "rgba(255, 255, 255, 0.03)",
							padding: "10px",
							borderRadius: "10px",
							textAlign: "center",
							lineHeight: 1.4
						},
						children: "No naked-eye planets are currently above the horizon. Scrub the clock forward to evening twilight!"
					}) : /* @__PURE__ */ jsx("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "6px"
						},
						children: visibleBodies.map((body) => /* @__PURE__ */ jsxs("div", {
							style: {
								background: "rgba(255, 255, 255, 0.04)",
								border: `1px solid ${body.colorHex}33`,
								borderRadius: "10px",
								padding: "7px 9px",
								display: "flex",
								flexDirection: "column",
								gap: "3px"
							},
							children: [/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ jsxs("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: "6px"
									},
									children: [/* @__PURE__ */ jsx("span", {
										style: { fontSize: "14px" },
										children: body.emoji
									}), /* @__PURE__ */ jsx("span", {
										style: {
											fontSize: "12px",
											fontWeight: 700,
											color: "#f8fafc"
										},
										children: body.name
									})]
								}), /* @__PURE__ */ jsxs("div", {
									style: {
										fontSize: "11px",
										fontWeight: 600,
										color: body.colorHex
									},
									children: [
										body.altitudeDeg,
										"° ",
										body.compassDirection
									]
								})]
							}), /* @__PURE__ */ jsx("div", {
								style: {
									fontSize: "10px",
									color: "#cbd5e1",
									lineHeight: 1.35
								},
								children: body.viewingTip
							})]
						}, body.id))
					})] }),
					/* @__PURE__ */ jsxs("button", {
						onClick: toggleViewMode,
						style: {
							background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.2))",
							border: "1px solid rgba(56, 189, 248, 0.45)",
							borderRadius: "12px",
							padding: "8px 12px",
							color: "#ffffff",
							fontSize: "11.5px",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							cursor: "pointer",
							transition: "all 0.15s ease"
						},
						children: [/* @__PURE__ */ jsx(Rocket, {
							size: 13,
							color: "#38bdf8"
						}), " Return to Space Orbit"]
					})
				]
			})
		]
	});
};
// src/state/useSatelliteStore.ts
var useSatelliteStore = create((set) => ({
	showSatellites: true,
	toggleSatellites: () => set((state) => ({ showSatellites: !state.showSatellites })),
	setShowSatellites: (show) => set({ showSatellites: show })
}));
// src/state/useSkyStore.ts
var useSkyStore = create((set) => ({
	showConstellationLines: true,
	showConstellationNames: true,
	showDeepSkyObjects: true,
	toggleConstellationLines: () => set((state) => ({ showConstellationLines: !state.showConstellationLines })),
	toggleConstellationNames: () => set((state) => ({ showConstellationNames: !state.showConstellationNames })),
	toggleDeepSkyObjects: () => set((state) => ({ showDeepSkyObjects: !state.showDeepSkyObjects })),
	setConstellationLines: (val) => set({ showConstellationLines: val }),
	setConstellationNames: (val) => set({ showConstellationNames: val }),
	setDeepSkyObjects: (val) => set({ showDeepSkyObjects: val })
}));
// src/components/ui/ZoomControls.tsx
var ToggleRow = ({ label, subtitle, icon, checked, onToggle, accentColor = "#38bdf8" }) => /* @__PURE__ */ jsxs("div", {
	onClick: onToggle,
	style: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "7px 9px",
		borderRadius: "12px",
		background: checked ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.02)",
		cursor: "pointer",
		transition: "background 0.15s ease",
		userSelect: "none"
	},
	children: [/* @__PURE__ */ jsxs("div", {
		style: {
			display: "flex",
			alignItems: "center",
			gap: "8px"
		},
		children: [/* @__PURE__ */ jsx("span", {
			style: { fontSize: "15px" },
			children: icon
		}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
			style: {
				fontSize: "12px",
				fontWeight: 600,
				color: "#f8fafc"
			},
			children: label
		}), /* @__PURE__ */ jsx("div", {
			style: {
				fontSize: "10px",
				color: "#94a3b8"
			},
			children: subtitle
		})] })]
	}), /* @__PURE__ */ jsx("div", {
		style: {
			width: "34px",
			height: "19px",
			borderRadius: "10px",
			background: checked ? accentColor : "rgba(255, 255, 255, 0.16)",
			boxShadow: checked ? `0 0 10px ${accentColor}88` : "none",
			position: "relative",
			transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
			flexShrink: 0
		},
		children: /* @__PURE__ */ jsx("div", { style: {
			width: "15px",
			height: "15px",
			borderRadius: "50%",
			background: "#ffffff",
			position: "absolute",
			top: "2px",
			left: checked ? "17px" : "2px",
			boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
			transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
		} })
	})]
});
var ZoomControls = ({ controlsRef }) => {
	const selectedId = useFocusStore((state) => state.selectedId);
	const clearSelection = useFocusStore((state) => state.clearSelection);
	const showSatellites = useSatelliteStore((state) => state.showSatellites);
	const toggleSatellites = useSatelliteStore((state) => state.toggleSatellites);
	const showConstellationLines = useSkyStore((state) => state.showConstellationLines);
	const showConstellationNames = useSkyStore((state) => state.showConstellationNames);
	const showDeepSkyObjects = useSkyStore((state) => state.showDeepSkyObjects);
	const toggleConstellationLines = useSkyStore((state) => state.toggleConstellationLines);
	const toggleConstellationNames = useSkyStore((state) => state.toggleConstellationNames);
	const toggleDeepSkyObjects = useSkyStore((state) => state.toggleDeepSkyObjects);
	const setConstellationLines = useSkyStore((state) => state.setConstellationLines);
	const setConstellationNames = useSkyStore((state) => state.setConstellationNames);
	const setDeepSkyObjects = useSkyStore((state) => state.setDeepSkyObjects);
	const viewMode = useGroundObserverStore((state) => state.viewMode);
	const toggleViewMode = useGroundObserverStore((state) => state.toggleViewMode);
	const location = useGroundObserverStore((state) => state.location);
	const setLocation = useGroundObserverStore((state) => state.setLocation);
	const showCompassRing = useGroundObserverStore((state) => state.showCompassRing);
	const showCardinalLabels = useGroundObserverStore((state) => state.showCardinalLabels);
	const showPlanetMarkers = useGroundObserverStore((state) => state.showPlanetMarkers);
	const showAltAzGrid = useGroundObserverStore((state) => state.showAltAzGrid);
	const setShowCompassRing = useGroundObserverStore((state) => state.setShowCompassRing);
	const setShowCardinalLabels = useGroundObserverStore((state) => state.setShowCardinalLabels);
	const setShowPlanetMarkers = useGroundObserverStore((state) => state.setShowPlanetMarkers);
	const setShowAltAzGrid = useGroundObserverStore((state) => state.setShowAltAzGrid);
	const [isSkyMenuOpen, setIsSkyMenuOpen] = useState(false);
	const skyMenuRef = useRef(null);
	const isMobile = useIsMobile();
	useEffect(() => {
		if (!isSkyMenuOpen) return;
		const handleClickOutside = (e) => {
			if (skyMenuRef.current && !skyMenuRef.current.contains(e.target)) setIsSkyMenuOpen(false);
		};
		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [isSkyMenuOpen]);
	const handleZoomIn = () => {
		controlsRef.current?.dolly(40, true);
	};
	const handleZoomOut = () => {
		controlsRef.current?.dolly(-40, true);
	};
	const handleReset = () => {
		clearSelection();
		controlsRef.current?.setLookAt(0, 80, 160, 0, 0, 0, true);
	};
	return /* @__PURE__ */ jsxs("div", {
		style: {
			position: "absolute",
			bottom: isMobile ? selectedId ? "74px" : "102px" : "24px",
			right: isMobile ? "10px" : "24px",
			zIndex: 40,
			display: "flex",
			flexDirection: "column",
			gap: isMobile ? "4px" : "6px",
			background: "rgba(10, 16, 30, 0.82)",
			backdropFilter: "blur(16px)",
			WebkitBackdropFilter: "blur(16px)",
			border: "1px solid rgba(255, 255, 255, 0.16)",
			borderRadius: "16px",
			padding: isMobile ? "4px" : "6px",
			boxShadow: "0 12px 30px rgba(0, 0, 0, 0.55)",
			transition: "bottom 0.25s ease"
		},
		children: [
			!isMobile && /* @__PURE__ */ jsx("button", {
				onClick: () => useTutorialStore.getState().openTutorial(),
				title: "Flight Manual & Game Controls Guide",
				style: {
					background: "rgba(255, 255, 255, 0.08)",
					border: "none",
					borderRadius: "10px",
					width: "34px",
					height: "34px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#38bdf8",
					cursor: "pointer",
					transition: "all 0.15s ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)";
					e.currentTarget.style.transform = "scale(1.08)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
					e.currentTarget.style.transform = "scale(1.0)";
				},
				children: /* @__PURE__ */ jsx(Gamepad2, { size: 18 })
			}),
			/* @__PURE__ */ jsxs("div", {
				style: { position: "relative" },
				ref: skyMenuRef,
				children: [/* @__PURE__ */ jsx("button", {
					onClick: () => setIsSkyMenuOpen((prev) => !prev),
					title: "Planetarium Sky Dome Settings (Constellations & Deep Sky)",
					style: {
						background: isSkyMenuOpen || showConstellationLines ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.08)",
						border: isSkyMenuOpen ? "1.5px solid #38bdf8" : showConstellationLines ? "1px solid rgba(56, 189, 248, 0.4)" : "none",
						borderRadius: "10px",
						width: "34px",
						height: "34px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "15px",
						color: isSkyMenuOpen || showConstellationLines ? "#38bdf8" : "#cbd5e1",
						cursor: "pointer",
						transition: "all 0.15s ease"
					},
					onMouseEnter: (e) => {
						e.currentTarget.style.transform = "scale(1.08)";
					},
					onMouseLeave: (e) => {
						e.currentTarget.style.transform = "scale(1.0)";
					},
					children: /* @__PURE__ */ jsx(Sparkles, { size: 16 })
				}), isSkyMenuOpen && /* @__PURE__ */ jsxs("div", {
					onClick: (e) => e.stopPropagation(),
					style: {
						position: "absolute",
						right: "44px",
						bottom: isMobile ? "-20px" : "0",
						width: isMobile ? "260px" : "285px",
						maxHeight: "75vh",
						overflowY: "auto",
						background: "rgba(10, 16, 32, 0.95)",
						backdropFilter: "blur(20px)",
						WebkitBackdropFilter: "blur(20px)",
						border: "1px solid rgba(56, 189, 248, 0.35)",
						borderRadius: "18px",
						padding: "14px",
						boxShadow: "0 16px 40px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.15)",
						color: "#ffffff",
						fontFamily: "system-ui, -apple-system, sans-serif",
						animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
						zIndex: 60
					},
					children: [
						/* @__PURE__ */ jsxs("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: "10px"
							},
							children: [/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px"
								},
								children: [/* @__PURE__ */ jsx(Sparkles, {
									size: 15,
									color: "#38bdf8"
								}), /* @__PURE__ */ jsx("span", {
									style: {
										fontSize: "13px",
										fontWeight: 700,
										color: "#f8fafc",
										letterSpacing: "0.2px"
									},
									children: "Sky & Observer Settings"
								})]
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => setIsSkyMenuOpen(false),
								style: {
									background: "rgba(255, 255, 255, 0.08)",
									border: "none",
									borderRadius: "50%",
									width: "20px",
									height: "20px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#94a3b8",
									cursor: "pointer"
								},
								children: /* @__PURE__ */ jsx(X, { size: 12 })
							})]
						}),
						/* @__PURE__ */ jsxs("button", {
							onClick: toggleViewMode,
							style: {
								width: "100%",
								background: viewMode === "ground" ? "linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(56, 189, 248, 0.15))" : "linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(168, 85, 247, 0.12))",
								border: viewMode === "ground" ? "1.5px solid #4ade80" : "1px solid rgba(56, 189, 248, 0.35)",
								borderRadius: "12px",
								padding: "8px 10px",
								color: "#ffffff",
								marginBottom: "10px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								cursor: "pointer",
								transition: "all 0.15s ease"
							},
							children: [/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "7px"
								},
								children: [/* @__PURE__ */ jsx("span", {
									style: { fontSize: "16px" },
									children: viewMode === "ground" ? "🚀" : "🏡"
								}), /* @__PURE__ */ jsxs("div", {
									style: { textAlign: "left" },
									children: [/* @__PURE__ */ jsx("div", {
										style: {
											fontSize: "11.5px",
											fontWeight: 700,
											color: viewMode === "ground" ? "#4ade80" : "#38bdf8"
										},
										children: viewMode === "ground" ? "Return to Space Orbit" : "Stand on Earth (Backyard Mode)"
									}), /* @__PURE__ */ jsx("div", {
										style: {
											fontSize: "9.5px",
											color: "#94a3b8"
										},
										children: viewMode === "ground" ? "Macro solar system view" : `Look up from ${location.name}`
									})]
								})]
							}), /* @__PURE__ */ jsx("span", {
								style: {
									fontSize: "11px",
									color: "#cbd5e1"
								},
								children: "→"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "5px",
								marginBottom: "8px"
							},
							children: [
								/* @__PURE__ */ jsx(ToggleRow, {
									label: "Constellation Lines",
									subtitle: "22 IAU stick figures",
									icon: "📐",
									checked: showConstellationLines,
									onToggle: toggleConstellationLines,
									accentColor: "#38bdf8"
								}),
								/* @__PURE__ */ jsx(ToggleRow, {
									label: "Constellation Names",
									subtitle: "Latin & English labels",
									icon: "🏷️",
									checked: showConstellationNames,
									onToggle: toggleConstellationNames,
									accentColor: "#fbbf24"
								}),
								/* @__PURE__ */ jsx(ToggleRow, {
									label: "Deep Sky Objects",
									subtitle: "12 Messier nebulae & galaxies",
									icon: "🌌",
									checked: showDeepSkyObjects,
									onToggle: toggleDeepSkyObjects,
									accentColor: "#c084fc"
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							style: {
								display: "flex",
								gap: "6px",
								marginBottom: "10px"
							},
							children: [/* @__PURE__ */ jsx("button", {
								onClick: () => {
									setConstellationLines(true);
									setConstellationNames(true);
									setDeepSkyObjects(true);
								},
								style: {
									flex: 1,
									background: "rgba(56, 189, 248, 0.16)",
									border: "1px solid rgba(56, 189, 248, 0.3)",
									borderRadius: "10px",
									padding: "5px 4px",
									color: "#38bdf8",
									fontSize: "10.5px",
									fontWeight: 600,
									cursor: "pointer",
									transition: "background 0.15s ease"
								},
								children: "✨ Planetarium"
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => {
									setConstellationLines(false);
									setConstellationNames(false);
									setDeepSkyObjects(false);
								},
								style: {
									flex: 1,
									background: "rgba(255, 255, 255, 0.06)",
									border: "1px solid rgba(255, 255, 255, 0.12)",
									borderRadius: "10px",
									padding: "5px 4px",
									color: "#cbd5e1",
									fontSize: "10.5px",
									fontWeight: 600,
									cursor: "pointer",
									transition: "background 0.15s ease"
								},
								children: "🌌 Stars Only"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							style: {
								borderTop: "1px solid rgba(255, 255, 255, 0.08)",
								paddingTop: "9px"
							},
							children: [
								/* @__PURE__ */ jsxs("div", {
									style: {
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										marginBottom: "6px"
									},
									children: [/* @__PURE__ */ jsxs("span", {
										style: {
											fontSize: "11px",
											color: "#94a3b8",
											fontWeight: 600,
											display: "flex",
											alignItems: "center",
											gap: "4px"
										},
										children: [/* @__PURE__ */ jsx(MapPin, {
											size: 12,
											color: "#4ade80"
										}), " Observer City:"]
									}), /* @__PURE__ */ jsxs("span", {
										style: {
											fontSize: "11px",
											color: "#4ade80",
											fontWeight: 700
										},
										children: [
											location.flagEmoji,
											" ",
											location.name
										]
									})]
								}),
								/* @__PURE__ */ jsx("div", {
									style: {
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "4px",
										marginBottom: "8px"
									},
									children: PRESET_LOCATIONS.map((preset) => {
										const isSelected = location.id === preset.id;
										return /* @__PURE__ */ jsxs("button", {
											onClick: () => setLocation(preset),
											style: {
												background: isSelected ? "rgba(74, 222, 128, 0.2)" : "rgba(255, 255, 255, 0.04)",
												border: isSelected ? "1px solid #4ade80" : "1px solid rgba(255, 255, 255, 0.08)",
												borderRadius: "8px",
												padding: "4px 6px",
												color: isSelected ? "#4ade80" : "#cbd5e1",
												fontSize: "10.5px",
												fontWeight: 600,
												cursor: "pointer",
												textAlign: "left",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
												transition: "all 0.15s ease"
											},
											children: [
												preset.flagEmoji,
												" ",
												preset.name
											]
										}, preset.id);
									})
								}),
								/* @__PURE__ */ jsxs("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: "5px"
									},
									children: [
										/* @__PURE__ */ jsx(ToggleRow, {
											label: "Compass Dial",
											subtitle: "360° cardinal horizon ring",
											icon: "🧭",
											checked: showCompassRing,
											onToggle: () => setShowCompassRing(!showCompassRing),
											accentColor: "#38bdf8"
										}),
										/* @__PURE__ */ jsx(ToggleRow, {
											label: "Cardinal Direction Labels",
											subtitle: "Floating N, E, S, W markers",
											icon: "🏷️",
											checked: showCardinalLabels,
											onToggle: () => setShowCardinalLabels(!showCardinalLabels),
											accentColor: "#4ade80"
										}),
										/* @__PURE__ */ jsx(ToggleRow, {
											label: "Visible Planets",
											subtitle: "Topocentric markers & tips",
											icon: "🪐",
											checked: showPlanetMarkers,
											onToggle: () => setShowPlanetMarkers(!showPlanetMarkers),
											accentColor: "#f59e0b"
										}),
										/* @__PURE__ */ jsx(ToggleRow, {
											label: "Alt/Az Dome Grid",
											subtitle: "Planetarium coordinate lines",
											icon: "🌐",
											checked: showAltAzGrid,
											onToggle: () => setShowAltAzGrid(!showAltAzGrid),
											accentColor: "#c084fc"
										})
									]
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsx("button", {
				onClick: toggleSatellites,
				title: showSatellites ? "Hide Earth Satellites (ISS, Hubble)" : "Show Earth Satellites (ISS, Hubble)",
				style: {
					background: showSatellites ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.08)",
					border: showSatellites ? "1px solid rgba(56, 189, 248, 0.5)" : "none",
					borderRadius: "10px",
					width: "34px",
					height: "34px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "15px",
					cursor: "pointer",
					transition: "all 0.15s ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.transform = "scale(1.08)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.transform = "scale(1.0)";
				},
				children: /* @__PURE__ */ jsx("span", { children: "🛰️" })
			}),
			/* @__PURE__ */ jsx("button", {
				onClick: toggleViewMode,
				title: viewMode === "ground" ? `Return to Space Orbit (currently observing from ${location.name})` : `Stand on Earth (Backyard Observer View from ${location.name})`,
				style: {
					background: viewMode === "ground" ? "linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(56, 189, 248, 0.25))" : "rgba(255, 255, 255, 0.08)",
					border: viewMode === "ground" ? "1.5px solid #4ade80" : "none",
					borderRadius: "10px",
					width: "34px",
					height: "34px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "15px",
					cursor: "pointer",
					boxShadow: viewMode === "ground" ? "0 0 12px rgba(74, 222, 128, 0.5)" : "none",
					transition: "all 0.15s ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.transform = "scale(1.08)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.transform = "scale(1.0)";
				},
				children: /* @__PURE__ */ jsx("span", { children: viewMode === "ground" ? "🚀" : "🏡" })
			}),
			/* @__PURE__ */ jsx("div", { style: {
				width: "100%",
				height: "1px",
				background: "rgba(255, 255, 255, 0.12)",
				margin: "2px 0"
			} }),
			/* @__PURE__ */ jsx("button", {
				onClick: handleZoomIn,
				"data-tutorial": "zoom-controls",
				title: "Zoom In (+)",
				style: {
					background: "rgba(255, 255, 255, 0.08)",
					border: "none",
					borderRadius: "10px",
					width: "34px",
					height: "34px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#ffffff",
					cursor: "pointer",
					transition: "all 0.15s ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)";
					e.currentTarget.style.color = "#38bdf8";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
					e.currentTarget.style.color = "#ffffff";
				},
				children: /* @__PURE__ */ jsx(Plus, { size: 18 })
			}),
			/* @__PURE__ */ jsx("button", {
				onClick: handleZoomOut,
				title: "Zoom Out (−)",
				style: {
					background: "rgba(255, 255, 255, 0.08)",
					border: "none",
					borderRadius: "10px",
					width: "34px",
					height: "34px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#ffffff",
					cursor: "pointer",
					transition: "all 0.15s ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)";
					e.currentTarget.style.color = "#38bdf8";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
					e.currentTarget.style.color = "#ffffff";
				},
				children: /* @__PURE__ */ jsx(Minus, { size: 18 })
			}),
			/* @__PURE__ */ jsx("div", { style: {
				width: "100%",
				height: "1px",
				background: "rgba(255, 255, 255, 0.12)",
				margin: "2px 0"
			} }),
			/* @__PURE__ */ jsx("button", {
				onClick: handleReset,
				title: "Reset Solar System Overview",
				style: {
					background: "rgba(255, 255, 255, 0.08)",
					border: "none",
					borderRadius: "10px",
					width: "34px",
					height: "34px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#38bdf8",
					cursor: "pointer",
					transition: "all 0.15s ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = "rgba(56, 189, 248, 0.3)";
					e.currentTarget.style.transform = "rotate(-45deg)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
					e.currentTarget.style.transform = "rotate(0deg)";
				},
				children: /* @__PURE__ */ jsx(RotateCcw, { size: 16 })
			})
		]
	});
};
// src/utils/guideAudio.ts
/**
* Clash of Clans-style Game Audio Effects for Guide Mascot
* Uses Web Audio API synthesizers (zero external assets or latency)
*/
var GuideAudio = class {
	ctx = null;
	initCtx() {
		if (!this.ctx && typeof window !== "undefined") {
			const AudioCtx = window.AudioContext || window.webkitAudioContext;
			if (AudioCtx) this.ctx = new AudioCtx();
		}
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	/** Cheerful bouncy 'pop' when speech bubble appears or advances */
	playPop() {
		try {
			this.initCtx();
			if (!this.ctx) return;
			const now = this.ctx.currentTime;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(440, now);
			osc.frequency.exponentialRampToValueAtTime(880, now + .08);
			gain.gain.setValueAtTime(.18, now);
			gain.gain.exponentialRampToValueAtTime(.001, now + .12);
			osc.connect(gain);
			gain.connect(this.ctx.destination);
			osc.start(now);
			osc.stop(now + .12);
		} catch {}
	}
	/** Tapping button / interactive action confirmation sound */
	playActionDing() {
		try {
			this.initCtx();
			if (!this.ctx) return;
			const now = this.ctx.currentTime;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(659.25, now);
			osc.frequency.setValueAtTime(880, now + .06);
			gain.gain.setValueAtTime(.2, now);
			gain.gain.exponentialRampToValueAtTime(.001, now + .2);
			osc.connect(gain);
			gain.connect(this.ctx.destination);
			osc.start(now);
			osc.stop(now + .2);
		} catch {}
	}
	/** Victory fanfare chime when tutorial completes (Supercell victory style) */
	playVictory() {
		try {
			this.initCtx();
			if (!this.ctx) return;
			const now = this.ctx.currentTime;
			[
				523.25,
				659.25,
				783.99,
				1046.5
			].forEach((freq, idx) => {
				if (!this.ctx) return;
				const noteTime = now + idx * .1;
				const osc = this.ctx.createOscillator();
				const gain = this.ctx.createGain();
				osc.type = "triangle";
				osc.frequency.setValueAtTime(freq, noteTime);
				gain.gain.setValueAtTime(.22, noteTime);
				gain.gain.exponentialRampToValueAtTime(.001, noteTime + .28);
				osc.connect(gain);
				gain.connect(this.ctx.destination);
				osc.start(noteTime);
				osc.stop(noteTime + .3);
			});
		} catch {}
	}
};
var guideAudio = new GuideAudio();
// src/components/ui/ControlsTutorial.tsx
var TUTORIAL_STEPS = [
	{
		title: "Look Around the Cosmos! 🌌",
		badge: "MISSION 1 OF 5",
		dialogue: "Drag anywhere on your screen to orbit and pivot your view in 360°!",
		highlightChip: "↔️ Drag to Look",
		bubblePosition: "top"
	},
	{
		title: "Target Planet Earth! 🌍",
		badge: "MISSION 2 OF 5",
		dialogue: "Tap Earth in the dock below to engage starship warp drive!",
		highlightChip: "🌍 Tap Earth",
		targetSelector: "[data-tutorial=\"earth-button\"]",
		bubblePosition: "top",
		handPosition: "above"
	},
	{
		title: "Telescopic Zoom! 🔭",
		badge: "MISSION 3 OF 5",
		dialogue: "Tap (+) or roll your mouse wheel to inspect continents and clouds!",
		highlightChip: "🔍 Tap (+) to Zoom",
		targetSelector: "[data-tutorial=\"zoom-controls\"]",
		bubblePosition: "top",
		handPosition: "left"
	},
	{
		title: "Warp Speed Time Travel! ⏳",
		badge: "MISSION 4 OF 5",
		dialogue: "Tap \"1 Day / sec\" to watch the planets race along their orbits!",
		highlightChip: "⚡ 1 Day / sec",
		targetSelector: "[data-tutorial=\"time-controls\"]",
		bubblePosition: "bottom",
		handPosition: "below"
	},
	{
		title: "Ready for Launch! ⭐",
		badge: "MISSION COMPLETE",
		dialogue: "Outstanding, Commander! The entire Solar System is yours to explore.",
		highlightChip: "🚀 All Systems Go",
		targetSelector: "[data-tutorial=\"photo-button\"]",
		bubblePosition: "top",
		handPosition: "above"
	}
];
var ControlsTutorial = () => {
	const isOpen = useTutorialStore((state) => state.isOpen);
	const activeStep = useTutorialStore((state) => state.activeSlide);
	const closeTutorial = useTutorialStore((state) => state.closeTutorial);
	const nextSlide = useTutorialStore((state) => state.nextSlide);
	const prevSlide = useTutorialStore((state) => state.prevSlide);
	const setSlide = useTutorialStore((state) => state.setSlide);
	const isMobile = useIsMobile();
	const selectedId = useFocusStore((state) => state.selectedId);
	const activePreset = useSimulationClock((state) => state.activePreset);
	const [targetRect, setTargetRect] = useState(null);
	const step = TUTORIAL_STEPS[Math.min(activeStep, TUTORIAL_STEPS.length - 1)];
	const isFinalStep = activeStep >= TUTORIAL_STEPS.length - 1;
	useEffect(() => {
		if (!isOpen) return;
		const updateRect = () => {
			if (step.targetSelector) {
				const el = document.querySelector(step.targetSelector);
				if (el) {
					setTargetRect(el.getBoundingClientRect());
					return;
				}
			}
			setTargetRect(null);
		};
		updateRect();
		const interval = setInterval(updateRect, 200);
		window.addEventListener("resize", updateRect);
		window.addEventListener("scroll", updateRect);
		return () => {
			clearInterval(interval);
			window.removeEventListener("resize", updateRect);
			window.removeEventListener("scroll", updateRect);
		};
	}, [
		isOpen,
		activeStep,
		step.targetSelector
	]);
	useEffect(() => {
		if (!isOpen) return;
		if (isFinalStep) guideAudio.playVictory();
		else guideAudio.playPop();
	}, [
		isOpen,
		activeStep,
		isFinalStep
	]);
	useEffect(() => {
		if (!isOpen) return;
		if (activeStep === 1 && selectedId === "earth") {
			guideAudio.playActionDing();
			const t = setTimeout(() => nextSlide(), 600);
			return () => clearTimeout(t);
		}
	}, [
		isOpen,
		activeStep,
		selectedId,
		nextSlide
	]);
	useEffect(() => {
		if (!isOpen) return;
		if (activeStep === 3 && activePreset === "day_per_sec") {
			guideAudio.playActionDing();
			const t = setTimeout(() => nextSlide(), 700);
			return () => clearTimeout(t);
		}
	}, [
		isOpen,
		activeStep,
		activePreset,
		nextSlide
	]);
	if (!isOpen) return null;
	const handleNext = () => {
		if (isFinalStep) closeTutorial();
		else {
			guideAudio.playPop();
			nextSlide();
		}
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("style", { children: `
        /* Clash of Clans Animations */
        @keyframes cocHandTapDown {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(14px) scale(0.92, 0.96); }
          45% { transform: translateY(8px) scale(1); }
          75% { transform: translateY(0) scale(1); }
        }

        @keyframes cocHandTapRight {
          0%, 100% { transform: translateX(0) scale(1); }
          30% { transform: translateX(14px) scale(0.92, 0.96); }
          45% { transform: translateX(8px) scale(1); }
          75% { transform: translateX(0) scale(1); }
        }

        @keyframes cocHandTapUp {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-14px) scale(0.92, 0.96); }
          45% { transform: translateY(-8px) scale(1); }
          75% { transform: translateY(0) scale(1); }
        }

        @keyframes cocRipple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          40% { transform: translate(-50%, -50%) scale(1.8); opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; }
        }

        @keyframes cocCanvasHandDrag {
          0%, 100% { transform: translateX(-50px) rotate(-12deg); opacity: 0.85; }
          50% { transform: translateX(50px) rotate(12deg); opacity: 1; }
        }

        @keyframes cocDialogEntrance {
          0% { transform: translate(-50%, -15px) scale(0.95); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }

        @keyframes cocSpotlightPulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(3, 7, 18, 0.68), 0 0 25px rgba(250, 204, 21, 0.7); }
          50% { box-shadow: 0 0 0 9999px rgba(3, 7, 18, 0.74), 0 0 38px rgba(250, 204, 21, 0.95); }
        }
      ` }),
		targetRect ? /* @__PURE__ */ jsx("div", { style: {
			position: "fixed",
			left: `${targetRect.left - 6}px`,
			top: `${targetRect.top - 6}px`,
			width: `${targetRect.width + 12}px`,
			height: `${targetRect.height + 12}px`,
			borderRadius: "16px",
			border: "3px solid #facc15",
			animation: "cocSpotlightPulse 2s ease-in-out infinite",
			pointerEvents: "none",
			zIndex: 88
		} }) : /* @__PURE__ */ jsx("div", { style: {
			position: "fixed",
			inset: 0,
			background: "rgba(3, 7, 18, 0.55)",
			pointerEvents: "none",
			zIndex: 88,
			transition: "opacity 0.3s ease"
		} }),
		targetRect && step.handPosition === "above" && /* @__PURE__ */ jsx("div", {
			style: {
				position: "fixed",
				left: `${targetRect.left + targetRect.width / 2}px`,
				top: `${targetRect.top - 10}px`,
				transform: "translate(-50%, -100%)",
				pointerEvents: "none",
				zIndex: 96,
				display: "flex",
				flexDirection: "column",
				alignItems: "center"
			},
			children: /* @__PURE__ */ jsxs("div", {
				style: {
					animation: "cocHandTapDown 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite",
					position: "relative",
					filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))"
				},
				children: [/* @__PURE__ */ jsxs("svg", {
					width: "60",
					height: "64",
					viewBox: "0 0 60 64",
					fill: "none",
					children: [
						/* @__PURE__ */ jsx("rect", {
							x: "18",
							y: "2",
							width: "24",
							height: "8",
							rx: "4",
							fill: "#3b82f6",
							stroke: "#0f172a",
							strokeWidth: "2.5"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M16 10H44C47 10 50 13 50 16V36C50 42 45 46 40 48L34 50V60C34 62 31 63 29 63C27 63 25 62 25 60V38C22 38 18 36 16 33C13 29 12 20 12 16C12 13 14 10 16 10Z",
							fill: "#ffffff",
							stroke: "#0f172a",
							strokeWidth: "2.8",
							strokeLinejoin: "round"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M26 36V58C26 60.5 28 62 30 62C32 62 34 60.5 34 58V36",
							fill: "#ffffff",
							stroke: "#0f172a",
							strokeWidth: "2.8",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M22 20V28",
							stroke: "#cbd5e1",
							strokeWidth: "2",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M30 20V28",
							stroke: "#cbd5e1",
							strokeWidth: "2",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M38 20V28",
							stroke: "#cbd5e1",
							strokeWidth: "2",
							strokeLinecap: "round"
						})
					]
				}), /* @__PURE__ */ jsx("div", { style: {
					position: "absolute",
					bottom: "-4px",
					left: "50%",
					width: "32px",
					height: "32px",
					borderRadius: "50%",
					border: "3px solid #facc15",
					background: "rgba(250, 204, 21, 0.35)",
					animation: "cocRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
					pointerEvents: "none"
				} })]
			})
		}),
		targetRect && step.handPosition === "left" && /* @__PURE__ */ jsx("div", {
			style: {
				position: "fixed",
				left: `${targetRect.left - 15}px`,
				top: `${targetRect.top + targetRect.height / 2}px`,
				transform: "translate(-100%, -50%)",
				pointerEvents: "none",
				zIndex: 96,
				display: "flex",
				alignItems: "center"
			},
			children: /* @__PURE__ */ jsxs("div", {
				style: {
					animation: "cocHandTapRight 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite",
					position: "relative",
					filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))",
					transform: "rotate(-90deg)"
				},
				children: [/* @__PURE__ */ jsxs("svg", {
					width: "60",
					height: "64",
					viewBox: "0 0 60 64",
					fill: "none",
					children: [
						/* @__PURE__ */ jsx("rect", {
							x: "18",
							y: "2",
							width: "24",
							height: "8",
							rx: "4",
							fill: "#3b82f6",
							stroke: "#0f172a",
							strokeWidth: "2.5"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M16 10H44C47 10 50 13 50 16V36C50 42 45 46 40 48L34 50V60C34 62 31 63 29 63C27 63 25 62 25 60V38C22 38 18 36 16 33C13 29 12 20 12 16C12 13 14 10 16 10Z",
							fill: "#ffffff",
							stroke: "#0f172a",
							strokeWidth: "2.8",
							strokeLinejoin: "round"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M26 36V58C26 60.5 28 62 30 62C32 62 34 60.5 34 58V36",
							fill: "#ffffff",
							stroke: "#0f172a",
							strokeWidth: "2.8",
							strokeLinecap: "round"
						})
					]
				}), /* @__PURE__ */ jsx("div", { style: {
					position: "absolute",
					bottom: "-4px",
					left: "50%",
					width: "32px",
					height: "32px",
					borderRadius: "50%",
					border: "3px solid #facc15",
					background: "rgba(250, 204, 21, 0.35)",
					animation: "cocRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
					pointerEvents: "none"
				} })]
			})
		}),
		targetRect && step.handPosition === "below" && /* @__PURE__ */ jsx("div", {
			style: {
				position: "fixed",
				left: `${targetRect.left + targetRect.width / 2}px`,
				top: `${targetRect.bottom + 10}px`,
				transform: "translate(-50%, 0)",
				pointerEvents: "none",
				zIndex: 96,
				display: "flex",
				flexDirection: "column",
				alignItems: "center"
			},
			children: /* @__PURE__ */ jsxs("div", {
				style: {
					animation: "cocHandTapUp 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite",
					position: "relative",
					filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))",
					transform: "rotate(180deg)"
				},
				children: [/* @__PURE__ */ jsxs("svg", {
					width: "60",
					height: "64",
					viewBox: "0 0 60 64",
					fill: "none",
					children: [
						/* @__PURE__ */ jsx("rect", {
							x: "18",
							y: "2",
							width: "24",
							height: "8",
							rx: "4",
							fill: "#3b82f6",
							stroke: "#0f172a",
							strokeWidth: "2.5"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M16 10H44C47 10 50 13 50 16V36C50 42 45 46 40 48L34 50V60C34 62 31 63 29 63C27 63 25 62 25 60V38C22 38 18 36 16 33C13 29 12 20 12 16C12 13 14 10 16 10Z",
							fill: "#ffffff",
							stroke: "#0f172a",
							strokeWidth: "2.8",
							strokeLinejoin: "round"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M26 36V58C26 60.5 28 62 30 62C32 62 34 60.5 34 58V36",
							fill: "#ffffff",
							stroke: "#0f172a",
							strokeWidth: "2.8",
							strokeLinecap: "round"
						})
					]
				}), /* @__PURE__ */ jsx("div", { style: {
					position: "absolute",
					bottom: "-4px",
					left: "50%",
					width: "32px",
					height: "32px",
					borderRadius: "50%",
					border: "3px solid #facc15",
					background: "rgba(250, 204, 21, 0.35)",
					animation: "cocRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
					pointerEvents: "none"
				} })]
			})
		}),
		activeStep === 0 && /* @__PURE__ */ jsxs("div", {
			style: {
				position: "fixed",
				top: "55%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				pointerEvents: "none",
				zIndex: 96,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "14px"
			},
			children: [/* @__PURE__ */ jsx("div", {
				style: {
					fontSize: "56px",
					animation: "cocCanvasHandDrag 2s ease-in-out infinite",
					filter: "drop-shadow(0 0 25px rgba(56, 189, 248, 0.9))"
				},
				children: "👆"
			}), /* @__PURE__ */ jsx("div", {
				style: {
					background: "rgba(15, 23, 42, 0.88)",
					border: "2px solid #38bdf8",
					borderRadius: "24px",
					padding: "6px 20px",
					color: "#ffffff",
					fontSize: "13px",
					fontWeight: 700,
					boxShadow: "0 8px 30px rgba(0, 0, 0, 0.8)"
				},
				children: "Click & Drag anywhere in space"
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			style: {
				position: "fixed",
				left: "50%",
				top: step.bubblePosition === "top" ? isMobile ? "8px" : "28px" : "auto",
				bottom: step.bubblePosition === "bottom" ? isMobile ? "80px" : "96px" : "auto",
				transform: "translateX(-50%)",
				zIndex: 98,
				display: "flex",
				alignItems: "center",
				gap: isMobile ? "10px" : "16px",
				width: isMobile ? "calc(100vw - 16px)" : "90%",
				maxWidth: "560px",
				animation: "cocDialogEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
				fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"
			},
			children: [/* @__PURE__ */ jsxs("div", {
				style: {
					position: "relative",
					width: isMobile ? "64px" : "84px",
					height: isMobile ? "64px" : "84px",
					flexShrink: 0,
					borderRadius: "50%",
					background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #818cf8 100%)",
					border: isMobile ? "3px solid #facc15" : "4px solid #facc15",
					boxShadow: "0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(250, 204, 21, 0.5)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ jsxs("svg", {
					width: isMobile ? "56" : "76",
					height: isMobile ? "56" : "76",
					viewBox: "0 0 100 100",
					fill: "none",
					children: [
						/* @__PURE__ */ jsx("path", {
							d: "M20 90C20 74 34 68 50 68C66 68 80 74 80 90H20Z",
							fill: "#1e293b"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M30 90C30 78 40 73 50 73C60 73 70 78 70 90H30Z",
							fill: "#334155"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: "50",
							cy: "82",
							r: "5",
							fill: "#facc15",
							stroke: "#713f12",
							strokeWidth: "1.5"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: "50",
							cy: "46",
							r: "32",
							fill: "#e2e8f0",
							stroke: "#0f172a",
							strokeWidth: "3"
						}),
						/* @__PURE__ */ jsx("ellipse", {
							cx: "50",
							cy: "47",
							rx: "24",
							ry: "20",
							fill: "url(#cocVisorGrad)",
							stroke: "#713f12",
							strokeWidth: "2.5"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: "42",
							cy: "45",
							r: "3.2",
							fill: "#1e1b4b"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: "58",
							cy: "45",
							r: "3.2",
							fill: "#1e1b4b"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M44 54C47 58 53 58 56 54",
							stroke: "#1e1b4b",
							strokeWidth: "2.5",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ jsx("ellipse", {
							cx: "37",
							cy: "51",
							rx: "3.5",
							ry: "2",
							fill: "#f43f5e",
							opacity: "0.6"
						}),
						/* @__PURE__ */ jsx("ellipse", {
							cx: "63",
							cy: "51",
							rx: "3.5",
							ry: "2",
							fill: "#f43f5e",
							opacity: "0.6"
						}),
						/* @__PURE__ */ jsx("path", {
							d: "M34 36C40 32 60 32 66 36",
							stroke: "#ffffff",
							strokeWidth: "3",
							strokeLinecap: "round",
							opacity: "0.85"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: "64",
							cy: "38",
							r: "2",
							fill: "#ffffff"
						}),
						/* @__PURE__ */ jsx("circle", {
							cx: "50",
							cy: "12",
							r: "4",
							fill: "#38bdf8",
							stroke: "#0f172a",
							strokeWidth: "2"
						}),
						/* @__PURE__ */ jsx("line", {
							x1: "50",
							y1: "16",
							x2: "50",
							y2: "10",
							stroke: "#0f172a",
							strokeWidth: "2.5"
						}),
						/* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
							id: "cocVisorGrad",
							x1: "50",
							y1: "27",
							x2: "50",
							y2: "67",
							gradientUnits: "userSpaceOnUse",
							children: [
								/* @__PURE__ */ jsx("stop", { stopColor: "#fef08a" }),
								/* @__PURE__ */ jsx("stop", {
									offset: "0.6",
									stopColor: "#f59e0b"
								}),
								/* @__PURE__ */ jsx("stop", {
									offset: "1",
									stopColor: "#b45309"
								})
							]
						}) })
					]
				}), /* @__PURE__ */ jsx("div", { style: {
					position: "absolute",
					top: "6px",
					right: "6px",
					width: "12px",
					height: "12px",
					borderRadius: "50%",
					background: "#22c55e",
					border: "2px solid #ffffff",
					boxShadow: "0 0 8px #22c55e"
				} })]
			}), /* @__PURE__ */ jsxs("div", {
				style: {
					position: "relative",
					background: "linear-gradient(180deg, #fffef9 0%, #fef3c7 100%)",
					border: isMobile ? "2.5px solid #78350f" : "3.5px solid #78350f",
					borderRadius: isMobile ? "18px" : "22px",
					padding: isMobile ? "10px 14px" : "14px 18px",
					boxShadow: "0 16px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(250, 204, 21, 0.35)",
					flex: 1,
					color: "#1e293b"
				},
				children: [
					/* @__PURE__ */ jsx("div", { style: {
						position: "absolute",
						left: "-14px",
						top: "50%",
						transform: "translateY(-50%)",
						width: 0,
						height: 0,
						borderTop: "10px solid transparent",
						borderBottom: "10px solid transparent",
						borderRight: "14px solid #78350f"
					} }),
					/* @__PURE__ */ jsx("div", { style: {
						position: "absolute",
						left: "-9px",
						top: "50%",
						transform: "translateY(-50%)",
						width: 0,
						height: 0,
						borderTop: "7px solid transparent",
						borderBottom: "7px solid transparent",
						borderRight: "10px solid #fffef9"
					} }),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: "6px"
						},
						children: [/* @__PURE__ */ jsxs("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: "8px"
							},
							children: [/* @__PURE__ */ jsx("span", {
								style: {
									fontSize: "13px",
									fontWeight: 900,
									color: "#78350f",
									letterSpacing: "0.2px"
								},
								children: "Officer Nova"
							}), /* @__PURE__ */ jsx("span", {
								style: {
									background: "#fef08a",
									border: "1.5px solid #ca8a04",
									borderRadius: "10px",
									padding: "1px 8px",
									fontSize: "10px",
									fontWeight: 900,
									color: "#854d0e",
									textTransform: "uppercase",
									letterSpacing: "0.5px"
								},
								children: step.badge
							})]
						}), /* @__PURE__ */ jsx("button", {
							onClick: closeTutorial,
							title: "Skip Tutorial",
							style: {
								background: "rgba(120, 53, 15, 0.08)",
								border: "none",
								borderRadius: "50%",
								width: "22px",
								height: "22px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#78350f",
								cursor: "pointer",
								transition: "all 0.15s ease"
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.background = "#ef4444";
								e.currentTarget.style.color = "#ffffff";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.background = "rgba(120, 53, 15, 0.08)";
								e.currentTarget.style.color = "#78350f";
							},
							children: /* @__PURE__ */ jsx(X, { size: 14 })
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						style: {
							fontSize: "15px",
							fontWeight: 800,
							lineHeight: "1.35",
							color: "#0f172a",
							marginBottom: "10px"
						},
						children: step.dialogue
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "10px"
						},
						children: [
							/* @__PURE__ */ jsx("div", {
								style: {
									background: "#e0f2fe",
									border: "1.5px solid #38bdf8",
									borderRadius: "12px",
									padding: "3px 10px",
									fontSize: "11.5px",
									fontWeight: 800,
									color: "#0369a1"
								},
								children: step.highlightChip
							}),
							/* @__PURE__ */ jsx("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "5px"
								},
								children: TUTORIAL_STEPS.map((_, idx) => /* @__PURE__ */ jsx("button", {
									onClick: () => setSlide(idx),
									style: {
										width: idx === activeStep ? "16px" : "6px",
										height: "6px",
										borderRadius: "3px",
										background: idx === activeStep ? "#d97706" : "#cbd5e1",
										border: "none",
										cursor: "pointer",
										transition: "all 0.2s ease"
									}
								}, idx))
							}),
							/* @__PURE__ */ jsxs("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: "6px"
								},
								children: [activeStep > 0 && !isFinalStep && /* @__PURE__ */ jsx("button", {
									onClick: prevSlide,
									style: {
										background: "transparent",
										border: "none",
										color: "#64748b",
										fontSize: "12px",
										fontWeight: 700,
										cursor: "pointer",
										padding: "4px 6px"
									},
									children: "Back"
								}), /* @__PURE__ */ jsx("button", {
									onClick: handleNext,
									style: {
										background: isFinalStep ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
										border: "2px solid #78350f",
										borderRadius: "16px",
										padding: "6px 14px",
										color: "#ffffff",
										fontSize: "12.5px",
										fontWeight: 900,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										boxShadow: "0 4px 10px rgba(0, 0, 0, 0.25)",
										transition: "transform 0.15s ease",
										whiteSpace: "nowrap"
									},
									onMouseEnter: (e) => {
										e.currentTarget.style.transform = "scale(1.05)";
									},
									onMouseLeave: (e) => {
										e.currentTarget.style.transform = "scale(1.0)";
									},
									children: isFinalStep ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(CheckCircle2, { size: 15 }), /* @__PURE__ */ jsx("span", { children: "Let's Explore! 🚀" })] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", { children: "Next" }), /* @__PURE__ */ jsx(ChevronRight, { size: 15 })] })
								})]
							})
						]
					})
				]
			})]
		})
	] });
};
// src/test_components.tsx
useFocusStore.getInitialState = () => useFocusStore.getState();
useSpaceshipStore.getInitialState = () => useSpaceshipStore.getState();
useTourStore.getInitialState = () => useTourStore.getState();
useTutorialStore.getInitialState = () => useTutorialStore.getState();
var mockControlsRef = { current: null };
var targets = [
	{
		id: "earth",
		name: "Earth",
		radius: 2.2,
		type: "planet"
	},
	{
		id: "mercury",
		name: "Mercury",
		radius: .85,
		type: "planet"
	},
	{
		id: "venus",
		name: "Venus",
		radius: 2.1,
		type: "planet"
	},
	{
		id: "mars",
		name: "Mars",
		radius: 1.18,
		type: "planet"
	},
	{
		id: "jupiter",
		name: "Jupiter",
		radius: 3.8,
		type: "planet"
	},
	{
		id: "saturn",
		name: "Saturn",
		radius: 3.2,
		type: "planet"
	},
	{
		id: "uranus",
		name: "Uranus",
		radius: 2.4,
		type: "planet"
	},
	{
		id: "neptune",
		name: "Neptune",
		radius: 2.3,
		type: "planet"
	},
	{
		id: "sun",
		name: "Sun",
		radius: 4.2,
		type: "star"
	},
	{
		id: "moon",
		name: "Moon",
		radius: .59,
		type: "moon"
	},
	{
		id: "iss",
		name: "ISS (Space Station)",
		radius: .25,
		type: "satellite"
	},
	{
		id: "halley",
		name: "Halley",
		radius: 1.2,
		type: "comet"
	},
	{
		id: "io",
		name: "Io",
		radius: .38,
		type: "moon"
	},
	{
		id: "europa",
		name: "Europa",
		radius: .34,
		type: "moon"
	},
	{
		id: "ganymede",
		name: "Ganymede",
		radius: .58,
		type: "moon"
	},
	{
		id: "callisto",
		name: "Callisto",
		radius: .54,
		type: "moon"
	},
	{
		id: "titan",
		name: "Titan",
		radius: .56,
		type: "moon"
	},
	{
		id: "triton",
		name: "Triton",
		radius: .32,
		type: "moon"
	}
];
console.log("--- STARTING COMPONENT RENDER TESTS ---");
for (const target of targets) {
	console.log(`Testing target: ${target.id} (${target.name})...`);
	try {
		useFocusStore.getState().selectBody(target);
		const selId = useFocusStore.getState().selectedId;
		console.log(`  State: selId=${selId}, inMeta=${selId ? selId in PLANETARY_METADATA : false}`);
		console.log(`  Tour=${useTourStore.getState().isOpen}, Tut=${useTutorialStore.getState().isOpen}`);
		const fc = React.createElement(FactCard);
		const factCardHtml = renderToString(fc);
		console.log(`  FactCard rendered (${factCardHtml.length} chars) -> ${factCardHtml.slice(0, 50)}`);
		const hudHtml = renderToString(/* @__PURE__ */ jsx(SpaceshipCockpitHUD, {}));
		console.log(`  SpaceshipCockpitHUD rendered (${hudHtml.length} chars)`);
		const dockHtml = renderToString(/* @__PURE__ */ jsx(PlanetDock, {}));
		console.log(`  PlanetDock rendered (${dockHtml.length} chars)`);
		const eclipseHtml = renderToString(/* @__PURE__ */ jsx(EclipseAlertBanner, {}));
		console.log(`  EclipseAlertBanner rendered (${eclipseHtml.length} chars)`);
		const neoHtml = renderToString(/* @__PURE__ */ jsx(NeoRadarBanner, {}));
		console.log(`  NeoRadarBanner rendered (${neoHtml.length} chars)`);
		const localSkyHtml = renderToString(/* @__PURE__ */ jsx(LocalSkyCard, {}));
		console.log(`  LocalSkyCard rendered (${localSkyHtml.length} chars)`);
		const zoomHtml = renderToString(/* @__PURE__ */ jsx(ZoomControls, { controlsRef: mockControlsRef }));
		console.log(`  ZoomControls rendered (${zoomHtml.length} chars)`);
		const tutHtml = renderToString(/* @__PURE__ */ jsx(ControlsTutorial, {}));
		console.log(`  ControlsTutorial rendered (${tutHtml.length} chars)`);
		console.log(`  SUCCESS for ${target.id}`);
	} catch (err) {
		console.error(`  FAILURE for ${target.id}:`, err);
	}
}
console.log("--- ALL TESTS FINISHED ---");
export {};
