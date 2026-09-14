import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Engine, disposeScene } from './core/Engine.js';
import { CameraController } from './core/CameraController.js';
import { DimensionalTransition } from './core/Transition.js';
import { journey } from './core/state.js';
import { World } from './worlds/World.js';
import { WORLD_DEFS } from './worlds/worldConfigs.js';
import { VoidScene } from './worlds/Void.js';
import { Overlay } from './ui/Overlay.js';
import {
  isValidXHandle,
  isValidReplyUrl,
  isValidEthAddress,
  submitWhitelist,
} from './services/verify.js';
import { Ambience } from './services/audio.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class WhitelistJourney {
  constructor() {
    this.engine = new Engine(document.getElementById('stage'));
    this.overlay = new Overlay(document.getElementById('ui-root'));
    this.camera = new CameraController(this.engine.camera, {
      reducedMotion: this.engine.quality.reducedMotion,
    });
    this.ambience = new Ambience();
    this.world = null;

    this.engine.addUpdater((dt, t) => {
      this.camera.update(dt, t);
      if (this.world) this.world.update(dt, t);
      if (this.voidScene) this.voidScene.update(dt, t);
      this.overlay.updateTracking();
    });
    this.engine.start();
    this.setupAudioToggle();
  }

  setupAudioToggle() {
    if (!CONFIG.experience.allowAudio) return;
    const btn = document.getElementById('audio-toggle');
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const on = this.ambience.toggle();
      btn.textContent = on ? 'Sound on' : 'Sound off';
    });
  }

  // ---------------------------------------------------------------- WORLDS
  loadWorld(key) {
    const previous = this.world;
    this.world = new World(WORLD_DEFS[key], this.engine.quality);
    this.engine.setScene(this.world.scene);
    const cam = WORLD_DEFS[key].camera;
    this.camera.place(new THREE.Vector3(...cam.entry.pos), new THREE.Vector3(...cam.entry.look));
    if (previous) setTimeout(() => disposeScene(previous.scene), 1200);
    return this.world;
  }

  async travelTo(key, colors) {
    this.overlay.clear();
    this.overlay.untrack();
    this.ambience.swell();

    const corridor = new DimensionalTransition({
      colorA: colors.a,
      colorB: colors.b,
      edgeColor: colors.edge ?? colors.b,
      seed: key.length * 37,
      length: colors.length ?? 1500,
    });

    if (this.world) {
      const start = performance.now();
      const flashStep = () => {
        const k = Math.min(1, (performance.now() - start) / 900);
        this.world.flash(k * 0.85);
        if (k < 1) requestAnimationFrame(flashStep);
      };
      flashStep();
      await wait(950);
    }

    await corridor.run(this.engine, { duration: colors.duration ?? 5.2 });
    corridor.dispose();

    const world = this.loadWorld(key);
    this.settleFlash(world, 1800);
    return world;
  }

  settleFlash(world, ms) {
    world.flash(1);
    const start = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      world.flash(1 - k);
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  // --------------------------------------------------------------- OPENING
  async runOpening() {
    this.voidScene = new VoidScene(this.engine.quality);
    this.engine.setScene(this.voidScene.scene);
    this.camera.idle.amplitude = 0.6;
    this.camera.place(new THREE.Vector3(0, 0, 60), new THREE.Vector3(0, 0, -300));
    this.overlay.fadeFromBlack();

    // Silence and emptiness first. Nothing is asked of the visitor.
    await wait(this.engine.quality.reducedMotion ? 2200 : 4200);
    await this.voidScene.openPassage(4.2);
    await this.camera.surgeTo(new THREE.Vector3(0, 0, -240), new THREE.Vector3(0, 0, -400), 2.4);

    const corridor = new DimensionalTransition({ colorA: 0x2f6bd6, colorB: 0xffe3b0, edgeColor: 0x9fd0ff, seed: 11, length: 1700 });
    await corridor.run(this.engine, { duration: 6.0 });
    corridor.dispose();
    disposeScene(this.voidScene.scene);
    this.voidScene = null;
  }

  // ----------------------------------------------------------- DESERT EARTH
  async stageDesert() {
    const world = this.loadWorld('desert');
    this.settleFlash(world, 2400);
    this.camera.idle.amplitude = 0.45;

    await wait(3200);
    this.overlay.trackPoint(world.beacon, this.engine.camera, 'SIGNAL');

    const cam = WORLD_DEFS.desert.camera;
    await this.camera.moveTo(
      new THREE.Vector3(...cam.approach.pos),
      new THREE.Vector3(...cam.approach.look),
      this.engine.quality.reducedMotion ? 16 : 11
    );
    this.overlay.untrack();
    world.chargeBeacon(0.6);
    this.stageIdentify(world);
  }

  /** The signal reads the visitor's identity. No third-party login. */
  stageIdentify(world) {
    this.overlay.show({
      locus: `${WORLD_DEFS.desert.name} · UNKNOWN REALITY`,
      title: 'IDENTIFY YOURSELF',
      body: 'The signal records an identity that exists across realities. Enter your X username.',
      input: { placeholder: '@yourname', submitOnEnter: true },
      actions: [
        {
          label: 'TRANSMIT IDENTITY',
          primary: true,
          onClick: async (h, btn) => {
            const handle = isValidXHandle(h.value);
            if (!handle) {
              h.setStatus('NOT A VALID X USERNAME.', 'fail');
              return;
            }
            h.setBusy(btn, true, 'READING');
            journey.set({ xConnected: true, xHandle: handle });
            world.chargeBeacon(3.0);
            await wait(900);
            h.setStatus('IDENTITY LOCKED', 'ok');
            await wait(600);
            this.afterIdentify();
          },
        },
      ],
    });
  }

  async afterIdentify() {
    const world = this.world;
    this.overlay.clear();
    world.chargeBeacon(4.5);
    world.setEnergy(1);
    world.energyWave(world.beaconPosition(), 0xffd9a0);
    await wait(1400);
    await this.camera.surgeTo(
      world.beaconPosition().clone().add(new THREE.Vector3(0, 2, 30)),
      world.beaconPosition(),
      2.6
    );
    await this.travelTo('living', { a: 0xffc46b, b: 0x9dffe0, edge: 0xffe8b8, duration: 5.6 });
    await this.introduceLivingWorld();
    this.stageFollow();
  }

  async introduceLivingWorld() {
    const cam = WORLD_DEFS.living.camera;
    this.camera.idle.amplitude = 0.5;
    await wait(2000);
    await this.camera.moveTo(
      new THREE.Vector3(...cam.approach.pos),
      new THREE.Vector3(...cam.approach.look),
      this.engine.quality.reducedMotion ? 10 : 7
    );
  }

  // ------------------------------------------------------- TASK CHECKPOINTS
  /**
   * Shared shape for follow / like / repost.
   * VERIFY stays locked until the visitor has actually opened X and spent
   * a minimum amount of time away from the page.
   */
  taskStage({ locus, title, body, actionLabel, actionUrl, stateKey, next, waveColor }) {
    const world = this.world;
    world.chargeBeacon(0.8);
    let opened = 0;

    const handle = this.overlay.show({
      locus,
      title,
      body,
      actions: [
        {
          label: actionLabel,
          onClick: (h) => {
            opened = Date.now();
            window.open(actionUrl, '_blank', 'noopener');
            h.setStatus('WAITING FOR YOUR SIGNAL', '');
          },
        },
        {
          label: 'VERIFY',
          primary: true,
          onClick: async (h, btn) => {
            const min = CONFIG.experience.minTaskSeconds * 1000;
            if (!opened) {
              h.setStatus('SIGNAL NOT VERIFIED. COMPLETE THE ACTION FIRST.', 'fail');
              world.chargeBeacon(0.3);
              return;
            }
            if (Date.now() - opened < min) {
              const left = Math.ceil((min - (Date.now() - opened)) / 1000);
              h.setStatus(`SIGNAL STILL FORMING. ${left}S REMAINING.`, 'fail');
              return;
            }
            h.setBusy(btn, true, 'READING');
            await wait(1100);
            h.setBusy(btn, false);
            h.setStatus('VERIFIED', 'ok');
            journey.set({ [stateKey]: true });
            await this.taskSuccessResponse(waveColor);
            next();
          },
        },
      ],
    });
    return handle;
  }

  /** The world itself answers a completed task; no page reload, no popup. */
  async taskSuccessResponse(color = 0x9dffe0) {
    const world = this.world;
    this.overlay.clear();
    world.energyWave(world.beaconPosition(), color);
    world.chargeBeacon(2.6);
    world.setEnergy(Math.min(1, (world.energyTarget ?? 0) + 0.25));
    await wait(1500);

    // The next checkpoint lights up somewhere else in the world.
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * 90;
    const z = -160 - Math.random() * 120;
    world.moveBeacon(x, world.heightAt(x, z) + 18, z);
    this.camera.moveTo(
      new THREE.Vector3(x * 0.4, 26, z + 150),
      new THREE.Vector3(x, 16, z),
      3.4
    );
    await wait(1200);
  }

  stageFollow() {
    this.taskStage({
      locus: `${WORLD_DEFS.living.name} · LIVING REALITY`,
      title: 'FOLLOW THE SIGNAL',
      body: 'Follow our X account to continue.',
      actionLabel: 'FOLLOW ON X',
      actionUrl: CONFIG.x.profileUrl,
      stateKey: 'followVerified',
      waveColor: 0x9dffe0,
      next: () => this.stageLike(),
    });
  }

  stageLike() {
    this.taskStage({
      locus: `${WORLD_DEFS.living.name} · TRANSMISSION`,
      title: 'STABILIZE THE TRANSMISSION',
      body: 'Like the transmission to continue.',
      actionLabel: 'LIKE POST',
      actionUrl: CONFIG.x.postUrl,
      stateKey: 'likeVerified',
      waveColor: 0xbfe9ff,
      next: () => this.stageRepost(),
    });
  }

  stageRepost() {
    this.taskStage({
      locus: `${WORLD_DEFS.living.name} · TRANSMISSION`,
      title: 'AMPLIFY THE TRANSMISSION',
      body: 'Repost the transmission so it reaches other realities.',
      actionLabel: 'REPOST',
      actionUrl: CONFIG.x.postUrl,
      stateKey: 'repostVerified',
      waveColor: 0xffd9c0,
      next: () => this.stageComment(),
    });
  }

  stageComment() {
    this.world.chargeBeacon(1.2);
    this.overlay.show({
      locus: 'A QUESTION EXISTS IN EVERY REALITY',
      title: 'REPLY TO THE TRANSMISSION',
      body: CONFIG.copy.commentQuestion,
      actions: [
        {
          label: 'OPEN TRANSMISSION',
          onClick: () => window.open(CONFIG.x.postUrl, '_blank', 'noopener'),
        },
        {
          label: 'I HAVE REPLIED',
          primary: true,
          onClick: () => this.stageCommentLink(),
        },
      ],
    });
  }

  stageCommentLink() {
    return this.overlay.show({
      locus: 'TRANSMISSION COORDINATE',
      title: 'SUBMIT YOUR REPLY',
      body: 'Paste the link to your reply so it can be located across realities.',
      input: { placeholder: 'https://x.com/you/status/...', submitOnEnter: true },
      actions: [
        {
          label: 'SUBMIT',
          primary: true,
          onClick: async (h, btn) => {
            const url = h.value;
            if (!isValidReplyUrl(url)) {
              h.setStatus('COORDINATE NOT RECOGNIZED. USE THE FULL REPLY LINK.', 'fail');
              return;
            }
            h.setBusy(btn, true, 'LOCATING');
            await wait(700);
            journey.set({ commentSubmitted: true, commentUrl: url });
            h.setBusy(btn, false);
            h.setStatus('COORDINATE LOCKED', 'ok');
            await this.taskSuccessResponse(0xfff0c0);
            this.stageWallet();
          },
        },
      ],
    });
  }

  stageWallet() {
    const world = this.world;
    world.setEnergy(1);
    world.chargeBeacon(2.0);

    this.overlay.show({
      locus: 'FINAL COORDINATE',
      title: 'ENTER YOUR ETH WALLET ADDRESS',
      body: 'This address holds your place when the worlds open. No signature is required.',
      input: { placeholder: '0x...', submitOnEnter: true },
      actions: [
        {
          label: 'COMPLETE TRANSMISSION',
          primary: true,
          onClick: async (h, btn) => {
            const wallet = h.value;
            if (!isValidEthAddress(wallet)) {
              h.setStatus('ADDRESS NOT VALID IN THIS REALITY.', 'fail');
              return;
            }
            h.setBusy(btn, true, 'TRANSMITTING');
            const s = journey.get();
            const result = await submitWhitelist({
              xUser: s.xHandle,
              follow: s.followVerified,
              like: s.likeVerified,
              repost: s.repostVerified,
              comment: s.commentUrl,
              wallet: wallet.trim(),
            });
            h.setBusy(btn, false);
            if (!result.ok) {
              h.setStatus(result.reason, 'fail');
              return;
            }
            journey.set({ walletSubmitted: true, wallet, whitelistComplete: true, entryId: result.id });
            h.setStatus('RECORDED', 'ok');
            await wait(700);
            this.finalSequence();
          },
        },
      ],
    });
  }

  // ----------------------------------------------------------------- FINALE
  async finalSequence() {
    const world = this.world;
    this.overlay.clear();
    world.setEnergy(1);
    world.chargeBeacon(6);
    world.energyWave(world.beaconPosition(), 0xffffff);
    await wait(1600);
    await this.camera.surgeTo(
      world.beaconPosition().clone().add(new THREE.Vector3(0, 6, 40)),
      world.beaconPosition(),
      3.0
    );

    await this.travelTo('final', { a: 0x9dffe0, b: 0xd7c4ff, edge: 0xffd9f5, duration: 7.5, length: 2200 });

    const cam = WORLD_DEFS.final.camera;
    this.camera.idle.amplitude = 0.4;
    this.camera.moveTo(
      new THREE.Vector3(...cam.approach.pos),
      new THREE.Vector3(...cam.approach.look),
      14
    );

    await wait(2600);
    this.overlay.show({
      locus: WORLD_DEFS.final.name,
      title: 'TRANSMISSION COMPLETE',
      body: 'Your whitelist entry has been recorded.',
      actions: [],
    });
    await wait(5200);

    this.overlay.show({
      locus: 'BEYOND THIS HORIZON',
      title: '3,000 UNIVERSES · 3,000 WORLDS',
      body: 'They are being prepared for your arrival. We are traveling toward you.',
      actions: [],
    });
    await wait(6000);

    this.overlay.show({
      locus: 'NEXT SIGNAL',
      title: 'RESULTS ARRIVE ON X',
      body: 'GTD results will be announced on X once verification is complete. A checker will be available when the results are ready.',
      actions: [
        {
          label: 'FOLLOW FOR THE ANNOUNCEMENT',
          primary: true,
          onClick: () => window.open(CONFIG.x.profileUrl, '_blank', 'noopener'),
        },
      ],
    });
  }

  // ------------------------------------------------------------------ ENTRY
  async boot() {
    const debug = CONFIG.experience.debugStage;
    if (debug) return this.jumpTo(debug);

    const resume = journey.resumeStage();
    if (resume === 'arrival') {
      await this.runOpening();
      await this.stageDesert();
      return;
    }
    this.jumpTo(resume);
  }

  /** Resume without replaying the whole journey. */
  async jumpTo(stage) {
    const worldKey =
      stage === 'final' ? 'final'
      : stage === 'desert' || stage === 'connect' ? 'desert'
      : 'living';
    const world = this.loadWorld(worldKey);
    const cam = WORLD_DEFS[worldKey].camera;
    this.camera.place(new THREE.Vector3(...cam.approach.pos), new THREE.Vector3(...cam.approach.look));
    world.setEnergy(0.6);
    this.overlay.fadeFromBlack();
    await wait(1400);

    switch (stage) {
      case 'connect':
      case 'desert': return this.stageIdentify(world);
      case 'follow': return this.stageFollow();
      case 'like': return this.stageLike();
      case 'repost': return this.stageRepost();
      case 'comment': return this.stageComment();
      case 'commentLink': return this.stageCommentLink();
      case 'wallet': return this.stageWallet();
      case 'final': return this.finalSequence();
      default: return this.stageIdentify(world);
    }
  }
}

// WebGL is required; the worlds are never replaced by a static fallback.
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
  const app = new WhitelistJourney();
  window.__journey = app; // handy while building worlds
  app.boot();
}
