import * as THREE from 'three';
import { Engine, disposeScene } from '../core/Engine.js';
import { CameraController } from '../core/CameraController.js';
import { DimensionalTransition } from '../core/Transition.js';
import { World } from '../worlds/World.js';
import { Overlay } from '../ui/Overlay.js';
import { Ambience } from '../services/audio.js';

import { STEP2, travelDuration, planetDuration } from './config2.js';
import { NFTS, getNft, destinationIdFor, rewardFor } from './nftData.js';
import { DESTINATIONS } from './destinations.js';
import { journey2, STATES, formatClock } from './journey2.js';
import { transactionService, isDemo } from './transactionService.js';
import { CentralUniverse } from './CentralUniverse.js';
import { InjectionChamber } from './InjectionChamber.js';
import { TravelScene } from './TravelScene.js';
import { DimensionalBox } from './DimensionalBox.js';
import { InfoMachine } from './InfoMachine.js';
import { Hud } from './hud.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs a timed animation on the engine clock. */
function animate(engine, seconds, fn) {
  return new Promise((resolve) => {
    let e = 0;
    const stop = engine.addUpdater((dt, t) => {
      e += dt;
      const k = Math.min(1, e / seconds);
      fn(k, t, dt);
      if (k >= 1) { stop(); resolve(); }
    });
  });
}

class DimensionJourney {
  constructor() {
    this.engine = new Engine(document.getElementById('stage'));
    this.overlay = new Overlay(document.getElementById('ui-root'));
    this.hud = new Hud();
    this.ambience = new Ambience();
    this.camera = new CameraController(this.engine.camera, {
      reducedMotion: this.engine.quality.reducedMotion,
    });
    this.camEnabled = true;
    this.active = null;   // whatever scene object owns the current frame
    this.ticker = null;

    this.engine.addUpdater((dt, t) => {
      if (this.camEnabled) this.camera.update(dt, t);
      if (this.active?.update) this.active.update(dt, t);
    });
    this.engine.start();

    const btn = document.getElementById('audio-toggle');
    if (STEP2.mode === 'demo') btn.hidden = false;
    btn.addEventListener('click', () => {
      const on = this.ambience.toggle();
      btn.textContent = on ? 'Sound on' : 'Sound off';
    });
  }

  setScene(scene, sceneObject) {
    this.engine.setScene(scene);
    this.active = sceneObject;
  }

  // ======================================================= CENTRAL UNIVERSE
  async enterCentralUniverse({ cinematic = true } = {}) {
    const hub = new CentralUniverse(this.engine.quality);
    this.hub = hub;
    this.camEnabled = true;
    this.camera.idle.amplitude = 0.25;
    this.setScene(hub.scene, hub);

    const c = hub.camera;
    if (cinematic) {
      this.camera.place(new THREE.Vector3(...c.entry.pos), new THREE.Vector3(...c.entry.look));
      this.overlay.fadeFromBlack();
      // The universe alone first: dark, enormous, silent.
      await wait(4200);
      await this.camera.moveTo(
        new THREE.Vector3(...c.approach.pos),
        new THREE.Vector3(...c.approach.look),
        this.engine.quality.reducedMotion ? 13 : 9
      );
    } else {
      this.camera.place(new THREE.Vector3(...c.approach.pos), new THREE.Vector3(...c.approach.look));
      this.overlay.fadeFromBlack();
      await wait(1200);
    }
    this.stageEnter();
  }

  stageEnter() {
    this.overlay.show({
      locus: 'CENTRAL UNIVERSE',
      title: 'ENTER THE DIMENSION',
      body: 'The structure ahead is the only way out of this reality. Its door responds to travelers.',
      actions: [
        { label: 'APPROACH THE DOOR', primary: true, onClick: () => this.openBox() },
      ],
    });
  }

  async openBox() {
    this.overlay.clear();
    await wait(600);
    await this.hub.box.openDoor(3.4);
    const c = this.hub.camera;
    await this.camera.moveTo(
      new THREE.Vector3(...c.inside.pos),
      new THREE.Vector3(...c.inside.look),
      5.5
    );
    this.stageNftSelection();
  }

  // ========================================================= NFT SELECTION
  stageNftSelection() {
    const state = journey2.get();
    let selected = getNft(state.selectedToken) || null;

    const wrap = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'nft-grid';
    const detail = document.createElement('div');
    detail.className = 'nft-detail';
    detail.style.display = 'none';

    const renderDetail = () => {
      if (!selected) { detail.style.display = 'none'; return; }
      const dest = DESTINATIONS[selected.destination];
      detail.style.display = 'flex';
      detail.innerHTML = '';
      const img = document.createElement('img');
      img.src = selected.image;
      img.alt = selected.name;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML =
        `<strong>${selected.name}</strong>` +
        `TOKEN ID ${selected.tokenId}<br>` +
        `RARITY ${selected.rarity} · RANK ${selected.rarityRank}<br>` +
        `DESTINATION ${dest.name}`;
      detail.append(img, meta);
    };

    for (const nft of NFTS) {
      const card = document.createElement('div');
      card.className = 'nft-card' + (selected?.tokenId === nft.tokenId ? ' selected' : '');
      card.innerHTML =
        `<img src="${nft.image}" alt="${nft.name}">` +
        `<div class="id">#${String(nft.tokenId).padStart(4, '0')}</div>` +
        `<div class="rar">${nft.rarity}</div>`;
      card.addEventListener('click', () => {
        selected = nft;
        grid.querySelectorAll('.nft-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        renderDetail();
        handle.setStatus('');
      });
      grid.appendChild(card);
    }
    wrap.append(grid, detail);
    renderDetail();

    const handle = this.overlay.show({
      locus: 'INSIDE THE STRUCTURE',
      title: 'SELECT YOUR INJECTION',
      body: 'Each injection carries the coordinates of one universe. Yours decides where you arrive.',
      content: wrap,
      actions: [
        {
          label: 'CONFIRM SELECTION',
          primary: true,
          onClick: (h) => {
            if (!selected) { h.setStatus('SELECT AN INJECTION TO CONTINUE.', 'fail'); return; }
            journey2.transition(STATES.NFT_SELECTED, {
              selectedToken: selected.tokenId,
              destination: destinationIdFor(selected.tokenId),
            });
            this.stageStake();
          },
        },
      ],
    });
  }

  // ================================================================= STAKE
  stageStake() {
    const nft = getNft(journey2.get().selectedToken);
    const dest = DESTINATIONS[journey2.get().destination];

    const wrap = document.createElement('div');
    if (isDemo()) {
      const tag = document.createElement('div');
      tag.className = 'demo-tag';
      tag.textContent = 'DEMO MODE · NO REAL TRANSACTION';
      wrap.appendChild(tag);
    }
    const detail = document.createElement('div');
    detail.className = 'nft-detail';
    detail.innerHTML =
      `<img src="${nft.image}" alt="${nft.name}">` +
      `<div class="meta"><strong>${nft.name}</strong>` +
      `RARITY ${nft.rarity}<br>DESTINATION ${dest.name}<br>${dest.universe}</div>`;
    const line = document.createElement('div');
    line.className = 'stake-line';
    line.textContent = `REQUIRED STAKE · ${STEP2.stake.amount} ${STEP2.stake.currency}`;
    wrap.append(detail, line);

    this.overlay.show({
      locus: 'DIMENSIONAL TRANSIT',
      title: 'STAKE & BEGIN TRAVEL',
      body: isDemo()
        ? 'This build simulates the stake. Nothing is signed, no contract is called and no ETH leaves your wallet.'
        : 'Staking locks your injection for the duration of the journey.',
      content: wrap,
      actions: [
        { label: 'BACK', onClick: () => this.stageNftSelection() },
        { label: 'STAKE & BEGIN TRAVEL', primary: true, onClick: (h, btn) => this.runStake(h, btn) },
      ],
    });
  }

  async runStake(handle, btn) {
    const nft = getNft(journey2.get().selectedToken);
    journey2.transition(STATES.STAKE_PENDING);
    handle.setBusy(btn, true, 'PROCESSING');

    const result = await transactionService.stake(
      { tokenId: nft.tokenId, amount: STEP2.stake.amount },
      (label) => {
        handle.setStatus(label, label === 'STAKE CONFIRMED' ? 'ok' : '');
        this.hub?.box && (this.hub.box.underLight.intensity = 9);
      }
    );

    if (!result.ok) {
      handle.setBusy(btn, false);
      handle.setStatus('TRANSIT REFUSED', 'fail');
      journey2.transition(STATES.NFT_SELECTED);
      return;
    }

    journey2.transition(STATES.STAKE_CONFIRMED_DEMO);
    await wait(900);
    this.runInjection();
  }

  // ============================================================= INJECTION
  async runInjection() {
    const nft = getNft(journey2.get().selectedToken);
    this.overlay.clear();
    this.hud.show('DIMENSIONAL INJECTION', '');
    this.hud.setClock('');

    const chamber = new InjectionChamber(nft, this.engine.quality);
    this.chamber = chamber;
    this.camEnabled = false; // the sequence drives the camera itself
    const previous = this.engine.scene;
    this.setScene(chamber.scene, chamber);
    if (this.hub) setTimeout(() => disposeScene(previous), 1500);
    this.hub = null;

    journey2.transition(STATES.INJECTION_RUNNING);
    this.ambience.swell();

    await chamber.run(this.engine, (label) => this.hud.setNote(label));

    // The timer starts only now, after the injection is completely finished.
    journey2.startTravel();
    chamber.dispose();
    this.chamber = null;
    this.enterTravel({ cinematic: true });
  }

  // ================================================================ TRAVEL
  async enterTravel({ cinematic = false } = {}) {
    const nft = getNft(journey2.get().selectedToken);
    const travel = new TravelScene(this.engine.quality, {
      a: nft.palette.glow,
      b: nft.palette.liquid,
      seed: nft.tokenId,
    });
    this.travel = travel;
    this.camEnabled = false;
    const cam = this.engine.camera;
    cam.position.set(0, 0, 0);
    cam.rotation.set(0, 0, 0);
    cam.lookAt(0, 0, -100);

    const previous = this.engine.scene;
    this.setScene(travel.scene, travel);
    setTimeout(() => disposeScene(previous), 1500);

    if (!cinematic) this.overlay.fadeFromBlack();
    this.hud.show('TRAVELING TO YOUR EARTH', 'DIMENSIONAL TRANSIT IN PROGRESS');
    this.overlay.clear();

    // Slow camera drift, so the transit feels piloted rather than static.
    let drift = 0;
    this.travelUpdater = this.engine.addUpdater((dt, t) => {
      drift += dt;
      cam.position.x = Math.sin(t * 0.09) * 6;
      cam.position.y = Math.cos(t * 0.07) * 4;
      cam.rotation.z = Math.sin(t * 0.05) * 0.04;
      cam.lookAt(Math.sin(t * 0.04) * 20, Math.cos(t * 0.05) * 14, -400);
    });

    this.startTicker(() => {
      const left = journey2.travelRemainingMs();
      this.hud.setClock(formatClock(left));
      if (left <= 0) {
        this.stopTicker();
        this.runArrival();
      }
    });
  }

  async runArrival() {
    this.hud.setNote('ARRIVAL SEQUENCE ENGAGED');
    this.hud.setClock('00:00');
    if (this.travelUpdater) { this.travelUpdater(); this.travelUpdater = null; }

    await this.travel.openGateway(this.engine, this.engine.quality.reducedMotion ? 12 : 9);
    journey2.markArrived();
    this.hud.hide();
    this.travel.dispose();
    this.travel = null;
    await this.enterPlanet({ cinematic: true });
  }

  // ================================================================ PLANET
  async enterPlanet({ cinematic = false } = {}) {
    const state = journey2.get();
    const nft = getNft(state.selectedToken);
    const dest = DESTINATIONS[state.destination];

    const world = new World(dest, this.engine.quality);
    this.planet = world;

    // The arrival box: the same structure as the hub, lit to belong here.
    const bz = -30;
    const groundY = world.heightAt(0, bz);
    const box = new DimensionalBox({
      size: 10,
      underColor: nft.palette.glow,
      doorColor: nft.palette.liquid,
      hover: 1.2,
    });
    box.group.position.set(0, groundY, bz);
    world.scene.add(box.group);
    this.planetBox = box;

    // The reality readout standing outside the door.
    const mz = bz + 22;
    const machine = new InfoMachine(dest, nft.palette.glow);
    machine.group.position.set(1.5, world.heightAt(1.5, mz), mz);
    machine.group.rotation.y = Math.PI;
    world.scene.add(machine.group);
    this.machine = machine;

    const composite = {
      update: (dt, t) => { world.update(dt, t); box.update(dt, t); machine.update(dt, t); },
    };

    const previous = this.engine.scene;
    this.setScene(world.scene, composite);
    setTimeout(() => disposeScene(previous), 1500);

    this.camEnabled = true;
    this.camera.idle.amplitude = 0.25;
    this.overlay.fadeFromBlack();

    if (cinematic) {
      // The traveler steps out of the box into the new world.
      this.camera.place(
        new THREE.Vector3(0, groundY + 3.4, bz - 1),
        new THREE.Vector3(0, groundY + 3.4, bz + 12)
      );
      world.flash(1);
      await animate(this.engine, 2.6, (k) => world.flash(1 - k));
      await wait(900);
      await box.openDoor(3.2);
      await this.camera.moveTo(
        new THREE.Vector3(0, groundY + 3.2, bz + 13),
        new THREE.Vector3(1.5, groundY + 3.6, mz),
        6.5
      );
      await wait(800);
      await machine.reveal(6.5);
    } else {
      box.doorOpen = 1;
      this.camera.place(
        new THREE.Vector3(0, groundY + 3.2, bz + 13),
        new THREE.Vector3(1.5, groundY + 3.6, mz)
      );
      machine.revealed = 4;
      await wait(1200);
    }

    this.planetLoop(dest);
  }

  planetLoop(dest) {
    const remaining = journey2.planetRemainingMs();

    if (remaining <= 0 && journey2.state === STATES.PLANET_LOCKED) {
      journey2.transition(STATES.RETURN_AVAILABLE);
    }

    if (journey2.state === STATES.RETURN_AVAILABLE) {
      this.hud.hide();
      this.stageReturnAvailable(dest);
      return;
    }

    this.hud.show('DIMENSIONAL LOCK ACTIVE', `UNSTAKE UNAVAILABLE ON ${dest.name}`);
    this.startTicker(() => {
      const left = journey2.planetRemainingMs();
      this.hud.setClock(formatClock(left));
      if (left <= 0) {
        this.stopTicker();
        journey2.transition(STATES.RETURN_AVAILABLE);
        this.hud.hide();
        this.stageReturnAvailable(dest);
      }
    });

    // A quiet note about where the traveler is, then the world is left alone.
    setTimeout(() => {
      this.overlay.show({
        locus: dest.universe,
        title: `YOU HAVE ARRIVED ON ${dest.name}`,
        body: `${dest.summary} The return gateway opens when your planetary cycle ends.`,
        actions: [{ label: 'STAY WITH THE WORLD', onClick: () => this.overlay.clear() }],
      });
    }, 1200);
  }

  stageReturnAvailable(dest) {
    this.overlay.show({
      locus: dest.name,
      title: 'RETURN GATEWAY ACTIVE',
      body: 'Your planetary cycle is complete. The structure can carry you back to the central universe.',
      actions: [
        { label: 'RETURN THROUGH THE GATEWAY', primary: true, onClick: () => this.runReturn() },
      ],
    });
  }

  // ================================================================ RETURN
  async runReturn() {
    const nft = getNft(journey2.get().selectedToken);
    journey2.transition(STATES.RETURNING);
    this.overlay.clear();
    this.hud.hide();

    // Back inside the box, the door closes, and the passage takes over.
    const box = this.planetBox;
    const p = box.group.position;
    await this.camera.moveTo(
      new THREE.Vector3(p.x, p.y + 3.4, p.z + 2),
      new THREE.Vector3(p.x, p.y + 3.4, p.z - 12),
      4.5
    );
    await box.closeDoor(2.0);
    await animate(this.engine, 1.6, (k) => this.planet.flash(k * 0.9));

    const corridor = new DimensionalTransition({
      colorA: nft.palette.liquid,
      colorB: 0x9fd0ff,
      edgeColor: nft.palette.glow,
      seed: 5,
      length: 1900,
    });
    this.camEnabled = false;
    await corridor.run(this.engine, { duration: 7.0 });
    corridor.dispose();
    this.planet = null;

    await this.enterCentralUniverseForCompletion();
  }

  async enterCentralUniverseForCompletion() {
    const hub = new CentralUniverse(this.engine.quality);
    this.hub = hub;
    this.camEnabled = true;
    const c = hub.camera;
    this.camera.place(new THREE.Vector3(...c.approach.pos), new THREE.Vector3(...c.approach.look));
    const previous = this.engine.scene;
    this.setScene(hub.scene, hub);
    setTimeout(() => disposeScene(previous), 1500);

    hub.box.doorOpen = 1;
    await wait(2200);
    journey2.transition(STATES.JOURNEY_COMPLETE);
    this.stageReward();
  }

  // ================================================================ REWARD
  stageReward() {
    const state = journey2.get();
    const nft = getNft(state.selectedToken);
    const dest = DESTINATIONS[state.destination];
    const amount = rewardFor(nft, dest);

    const wrap = document.createElement('div');
    if (isDemo()) {
      const tag = document.createElement('div');
      tag.className = 'demo-tag';
      tag.textContent = 'DEMO MODE · NO TOKENS ARE TRANSFERRED';
      wrap.appendChild(tag);
    }
    const line = document.createElement('div');
    line.className = 'stake-line';
    line.textContent = `ALLOCATED REWARD · ${amount} ${STEP2.reward.symbol}`;
    wrap.appendChild(line);

    this.overlay.show({
      locus: 'CENTRAL UNIVERSE',
      title: 'YOUR JOURNEY IS COMPLETE',
      body: `You have returned from ${dest.name}.`,
      content: wrap,
      actions: [
        {
          label: 'CLAIM REWARD',
          primary: true,
          onClick: async (h, btn) => {
            h.setBusy(btn, true, 'CLAIMING');
            const res = await transactionService.claimReward({
              tokenId: nft.tokenId, amount, symbol: STEP2.reward.symbol,
            });
            h.setBusy(btn, false);
            journey2.transition(STATES.REWARD_CLAIM_DEMO, { rewardClaimed: true });
            h.setStatus(isDemo() ? `SIMULATED CLAIM · ${res.reference}` : 'CLAIMED', 'ok');
            setTimeout(() => this.stageJourneyEnd(dest, amount), 1800);
          },
        },
      ],
    });
  }

  stageJourneyEnd(dest, amount) {
    this.overlay.show({
      locus: 'TRANSIT LOG',
      title: `${amount} ${STEP2.reward.symbol} RECORDED`,
      body: isDemo()
        ? `Simulated claim for the journey to ${dest.name}. Nothing left your wallet and no tokens moved. Start again to travel to another reality.`
        : `Your reward from ${dest.name} has been claimed.`,
      actions: [
        {
          label: 'TRAVEL AGAIN',
          primary: true,
          onClick: () => {
            journey2.transition(STATES.IDLE, {
              selectedToken: null, destination: null, injectionCompleted: false,
              travelStartTimestamp: null, planetArrivalTimestamp: null, rewardClaimed: false,
            });
            this.overlay.clear();
            this.enterCentralUniverse({ cinematic: false });
          },
        },
      ],
    });
  }

  // ================================================================ TICKER
  startTicker(fn) {
    this.stopTicker();
    fn();
    this.ticker = setInterval(fn, 500);
  }

  stopTicker() {
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
  }

  // ================================================================== BOOT
  /**
   * Recovers the journey after a refresh. Timers are recomputed from their
   * stored start timestamps, so nothing restarts just because the page did.
   */
  async boot() {
    const forced = STEP2.debug.startAtState;
    const state = forced || journey2.state;

    switch (state) {
      case STATES.TRAVELING:
        if (journey2.travelElapsed()) {
          // The transit finished while the page was closed.
          journey2.markArrived();
          return this.enterPlanet({ cinematic: true });
        }
        return this.enterTravel({ cinematic: false });

      case STATES.ARRIVED:
      case STATES.PLANET_LOCKED:
      case STATES.RETURN_AVAILABLE:
        return this.enterPlanet({ cinematic: false });

      case STATES.RETURNING:
      case STATES.JOURNEY_COMPLETE:
      case STATES.REWARD_CLAIM_DEMO:
        await this.enterCentralUniverse({ cinematic: false });
        this.overlay.clear();
        return this.stageReward();

      case STATES.STAKE_CONFIRMED_DEMO:
      case STATES.INJECTION_RUNNING:
        // An injection interrupted mid-sequence replays from the chamber.
        journey2.patch({ state: STATES.STAKE_CONFIRMED_DEMO });
        return this.runInjection();

      default:
        return this.enterCentralUniverse({ cinematic: true });
    }
  }
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (!supportsWebGL()) {
  document.body.innerHTML =
    '<div class="noscript">This experience needs WebGL. Open it in an up-to-date browser.</div>';
} else {
  const app = new DimensionJourney();
  window.__dimension = app; // handy while building
  app.boot();
}
