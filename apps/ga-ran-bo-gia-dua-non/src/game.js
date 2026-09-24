'use strict';
const W = 540, H = 960, SHEET_URL = 'runtime/people-atlas.png', FOOD_SHEET_URL = 'runtime/food-atlas.png', CHEF_SHEET_URL = 'runtime/chef-atlas.png';

const CHEF_FLOW = [
  { frame: 1, label: 'Mở miệng', ms: 220 },
  { frame: 2, label: 'Đưa vào', ms: 220 },
  { frame: 3, label: 'Cắn miếng', ms: 200, bite: true },
  { frame: 4, label: 'Nhai 1', ms: 180 },
  { frame: 5, label: 'Nhai 2', ms: 200 },
  { frame: 6, label: 'Nuốt', ms: 220 },
  { frame: 7, label: 'Thỏa mãn', ms: 380, reaction: true },
  { frame: 0, label: 'Sẵn sàng', ms: 200 }
];

const LIBRARY = {
  Chicken: [
    ['Đùi gà', 'food', 'f0', 120],
    ['Cánh gà', 'food', 'f1', 110],
    ['Gà cay', 'food', 'f2', 135]
  ],
  Burgers: [
    ['Burger gà', 'food', 'f3', 125],
    ['Gà cuộn', 'food', 'f4', 105]
  ],
  Snacks: [
    ['Khoai tây', 'food', 'f5', 85],
    ['Hành vòng', 'food', 'f9', 90],
    ['Samosa', 'food', 'f10', 100]
  ],
  Drinks: [
    ['Nước dừa', 'food', 'f6', 35, true],
    ['Sinh tố bơ', 'food', 'f7', 35, true],
    ['Kem bơ', 'food', 'f8', 40, true]
  ],
  Rice: [
    ['Cơm trắng', 'food', 'f11', 95],
    ['Cơm cà ri', 'food', 'f12', 115],
    ['Cơm gia vị', 'food', 'f13', 105]
  ]
};

const COMMENTS = [
  'Măm măm, ngon quá!',
  'Tuyệt vời, bác đầu bếp ơi!',
  'Ngon bá cháy!',
  'Thêm một miếng nữa đi!',
  'Không thể rời mắt!'
];

class Mukbang extends Phaser.Scene {
  constructor() {
    super('mukbang');
    this.category = 'Chicken';
    this.progress = 0;
    this.coin = 0;
    this.busy = false;
    this.dragItem = null;
  }

  preload() {
    this.load.spritesheet('people', SHEET_URL, { frameWidth: 128, frameHeight: 160 });
    this.load.spritesheet('chef', CHEF_SHEET_URL, { frameWidth: 240, frameHeight: 220 });
    this.load.image('food', FOOD_SHEET_URL);
  }

  create() {
    this.category = 'Chicken';
    this.progress = 0;
    this.coin = 0;
    this.busy = false;
    this.dragItem = null;

    this.sliceFood();
    this.drawShell();
    this.drawLiveHeader();
    this.drawChef();
    this.drawTable();
    this.drawMenu();
    this.bindDrag();

    this.time.addEvent({ delay: 1700, loop: true, callback: () => this.pushComment() });
    this.time.delayedCall(3000, () => this.showGift());
  }

  sliceFood() {
    const t = this.textures.get('food');
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        t.add('f' + (r * 5 + c), 0, c * 240, r * 220, 240, 220);
      }
    }
  }

  drawShell() {
    const g = this.add.graphics();
    g.fillStyle(0x272727).fillRoundedRect(10, 8, 520, 944, 48);
    g.fillStyle(0x415064).fillRoundedRect(24, 24, 492, 912, 34);
    g.fillStyle(0xf0c18d).fillRect(31, 207, 478, 523);
    g.fillStyle(0xb87649).fillRect(31, 475, 478, 255);
    g.fillStyle(0xfff4d8).fillRoundedRect(31, 730, 478, 196, 20);
    this.add.rectangle(270, 941, 130, 5, 0x666666).setOrigin(0.5);
  }

  drawLiveHeader() {
    this.add.text(46, 44, 'LIVE', { fontFamily: 'Arial Black', fontSize: '16px', color: '#fff', backgroundColor: '#e94f5b', padding: { x: 9, y: 6 } });
    this.add.text(110, 51, 'MUKBANG', { fontFamily: 'Arial Black', fontSize: '17px', color: '#fff' });
    this.viewer = this.add.text(385, 51, '👁  1.2M', { fontStyle: 'bold', fontSize: '13px', color: '#fff', backgroundColor: '#334152', padding: { x: 8, y: 6 } });
    this.add.text(490, 47, '×', { fontSize: '30px', color: '#fff' }).setOrigin(0.5);

    this.commentGroup = this.add.container(48, 91);
    for (let i = 0; i < 3; i++) this.makeComment(i, COMMENTS[i]);
    this.add.text(270, 194, 'KÉO MÓN ĂN VÀO MIỆNG BÁC', { fontFamily: 'Arial Black', fontSize: '11px', color: '#ffe29a' }).setOrigin(0.5);
  }

  makeComment(row, text) {
    const colors = [0x70b7e0, 0x8fc46d, 0xd483cc];
    const y = row * 38;
    const b = this.add.rectangle(115, y, 230, 31, 0x263342, 0.9).setOrigin(0.5);
    const a = this.add.circle(10, y, 12, colors[row % 3]);
    const t = this.add.text(29, y, text, { fontSize: '12px', color: '#fff' }).setOrigin(0, 0.5);
    this.commentGroup.add([b, a, t]);
  }

  pushComment() {
    if (this.progress >= 600) return;
    const t = this.add.text(530, Phaser.Math.Between(100, 190), Phaser.Utils.Array.GetRandom(COMMENTS), {
      fontSize: '12px', fontStyle: 'bold', color: '#fff', backgroundColor: '#263342', padding: { x: 10, y: 7 }
    }).setOrigin(0, 0.5).setDepth(20);
    this.tweens.add({ targets: t, x: -250, duration: 4700, onComplete: () => t.destroy() });
  }

  drawChef() {
    this.chefContainer = this.add.container(270, 350);

    const shadow = this.add.ellipse(0, 96, 265, 34, 0x4e2f25, 0.22);
    this.chef = this.add.sprite(0, 0, 'chef', 0).setScale(1.42);

    this.handFoodSlot = this.add.sprite(26, -6, 'food', 'f0').setScale(0.44).setVisible(false).setDepth(10);

    this.chefContainer.add([shadow, this.chef, this.handFoodSlot]);

    this.tweens.add({ targets: this.chefContainer, y: 344, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.drawStateTag();
    this.drawEmotionBar();
  }

  drawStateTag() {
    this.stateTag = this.add.container(270, 456);

    this.stateShadow = this.add.graphics();
    this.stateShadow.fillStyle(0x4e2f25, 0.35).fillRoundedRect(-65, 3, 130, 28, 14);

    this.stateBg = this.add.graphics();
    this.stateBg.fillStyle(0xd85460, 1).fillRoundedRect(-65, 0, 130, 28, 14);
    this.stateBg.lineStyle(2, 0xffe4db, 0.8).strokeRoundedRect(-65, 0, 130, 28, 14);

    this.stateText = this.add.text(0, 14, 'SẴN SÀNG', {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#ffffff'
    }).setOrigin(0.5);

    this.stateTag.add([this.stateShadow, this.stateBg, this.stateText]);
  }

  updateStateTag(label) {
    this.stateText.setText(label.toUpperCase());
    const textWidth = Math.max(120, this.stateText.width + 36);
    const halfW = textWidth / 2;

    this.stateShadow.clear().fillStyle(0x4e2f25, 0.35).fillRoundedRect(-halfW, 3, textWidth, 28, 14);
    this.stateBg.clear()
      .fillStyle(0xd85460, 1).fillRoundedRect(-halfW, 0, textWidth, 28, 14)
      .lineStyle(2, 0xffe4db, 0.8).strokeRoundedRect(-halfW, 0, textWidth, 28, 14);

    this.tweens.add({
      targets: this.stateTag,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  drawEmotionBar() {
    const barW = 416, barH = 22, barX = 270 - barW / 2, barY = 492;

    const bgG = this.add.graphics();
    bgG.fillStyle(0x241712, 0.45).fillRoundedRect(barX, barY + 3, barW, barH, 11);
    bgG.fillStyle(0x211713, 1).fillRoundedRect(barX, barY, barW, barH, 11);
    bgG.lineStyle(2, 0xb88d61, 0.85).strokeRoundedRect(barX, barY, barW, barH, 11);

    this.emotionFill = this.add.graphics();
    this.renderEmotionFill(0);

    this.emotionText = this.add.text(270, 525, '😋 Hài lòng: 0%', {
      fontFamily: 'Arial Black',
      fontSize: '15px',
      color: '#ffea79',
      stroke: '#381c10',
      strokeThickness: 4
    }).setOrigin(0.5);
  }

  renderEmotionFill(targetW) {
    const barW = 416, barH = 22, barX = 270 - barW / 2, barY = 492;
    this.emotionFill.clear();
    if (targetW > 8) {
      this.emotionFill.fillStyle(0x4ed15b, 1).fillRoundedRect(barX + 2, barY + 2, Math.min(barW - 4, targetW), barH - 4, 9);
      this.emotionFill.fillStyle(0xffffff, 0.28).fillRoundedRect(barX + 4, barY + 3, Math.max(0, Math.min(barW - 8, targetW - 4)), (barH - 4) / 2, 5);
    }
  }

  drawTable() {
    const foods = [
      LIBRARY.Chicken[0],
      LIBRARY.Chicken[2],
      LIBRARY.Burgers[0],
      LIBRARY.Snacks[0],
      LIBRARY.Rice[1],
      LIBRARY.Drinks[1]
    ];
    const pos = [
      [105, 580],
      [270, 575],
      [425, 580],
      [105, 675],
      [270, 675],
      [425, 675]
    ];

    pos.forEach((p, i) => {
      if (i < 5) {
        this.drawPlate(p[0], p[1]);
      } else {
        this.add.ellipse(p[0], p[1] + 30, 76, 26, 0x3a1f14, 0.4);
      }
    });

    foods.forEach((food, i) => {
      this.foodSprite(food, pos[i][0], pos[i][1], 0.44, true);
    });
  }

  drawPlate(x, y) {
    this.add.ellipse(x, y + 28, 126, 44, 0x3a1f14, 0.42);
    this.add.ellipse(x, y + 26, 114, 36, 0x24120a, 0.35);

    const outerRim = this.add.ellipse(x, y + 22, 122, 44, 0xfffbf4);
    outerRim.setStrokeStyle(3, 0xc99c75);

    this.add.ellipse(x, y + 23, 102, 32, 0xedd9c0);
    this.add.ellipse(x, y + 24, 96, 26, 0xfbf3e7);
    this.add.ellipse(x, y + 21, 88, 12, 0xd6bda2, 0.5);
  }

  foodSprite(food, x, y, scale, drag) {
    const s = this.add.sprite(x, y, food[1], food[2]).setScale(scale).setData('food', food);
    if (drag) {
      s.setInteractive({ useHandCursor: true });
      s.on('pointerdown', p => this.beginDrag(food, p));
      this.tweens.add({
        targets: s,
        angle: { from: -1.5, to: 1.5 },
        duration: 900 + Phaser.Math.Between(0, 250),
        yoyo: true,
        repeat: -1
      });
    }
    return s;
  }

  drawMenu() {
    this.add.text(270, 749, 'THỰC ĐƠN CỦA BẠN', { fontFamily: 'Arial Black', fontSize: '19px', color: '#623d32' }).setOrigin(0.5);
    this.tabGroup = this.add.container();

    Object.keys(LIBRARY).forEach((name, i) => {
      const x = 76 + i * 97;
      const b = this.add.text(x, 781, name, {
        fontFamily: 'Arial Black',
        fontSize: '11px',
        color: name === this.category ? '#fff' : '#66453b',
        backgroundColor: name === this.category ? '#d86472' : '#ead8b8',
        padding: { x: 8, y: 7 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      b.on('pointerup', () => {
        this.category = name;
        this.drawMenuItems();
        this.drawTabsActive();
      });
      this.tabGroup.add(b);
    });

    this.menuItems = this.add.container();
    this.drawMenuItems();
  }

  drawTabsActive() {
    this.tabGroup.list.forEach((b, i) => {
      const on = Object.keys(LIBRARY)[i] === this.category;
      b.setBackgroundColor(on ? '#d86472' : '#ead8b8');
      b.setColor(on ? '#fff' : '#66453b');
    });
  }

  drawMenuItems() {
    this.menuItems.removeAll(true);
    LIBRARY[this.category].forEach((food, i) => this.addMenuCard(food, 110 + i * 160, 858));
  }

  addMenuCard(food, x, y) {
    const c = this.add.container(x, y);
    const shadow = this.add.rectangle(0, 5, 130, 105, 0xbc9b78, 0.45);
    const bg = this.add.rectangle(0, 0, 130, 105, 0xfff8e8).setStrokeStyle(3, 0xe1bd91);
    const s = this.add.sprite(0, -12, food[1], food[2]).setScale(0.38);
    const t = this.add.text(0, 38, food[0], { fontFamily: 'Arial Black', fontSize: '11px', color: '#66453b' }).setOrigin(0.5);

    c.add([shadow, bg, s, t]).setSize(130, 105).setInteractive({ useHandCursor: true });
    c.on('pointerdown', p => this.beginDrag(food, p));
    this.menuItems.add(c);
  }

  bindDrag() {
    this.input.on('pointermove', p => {
      if (this.dragItem) this.dragItem.setPosition(p.x, p.y);
    });

    this.input.on('pointerup', p => {
      if (!this.dragItem) return;
      const item = this.dragItem;
      const food = item.getData('food');
      const hit = Phaser.Math.Distance.Between(p.x, p.y, 270, 345) < 135;
      this.dragItem = null;

      if (hit && !this.busy) {
        item.destroy();
        this.consume(food);
      } else {
        this.tweens.add({ targets: item, alpha: 0, scale: 0, duration: 140, onComplete: () => item.destroy() });
      }
    });
  }

  beginDrag(food, pointer) {
    if (this.busy) return;
    this.dragItem?.destroy();
    this.dragItem = this.add.sprite(pointer.x, pointer.y, food[1], food[2]).setScale(0.48).setDepth(50).setData('food', food);
    this.tweens.add({ targets: this.dragItem, scaleX: '+=0.06', scaleY: '+=0.06', duration: 120, yoyo: true });
  }

  consume(food) {
    this.busy = true;

    this.handFoodSlot.setTexture('food', food[2]).setScale(0.44).setAlpha(1).setVisible(true);

    let step = 0;
    const run = () => {
      const state = CHEF_FLOW[step];
      this.chef.setFrame(state.frame);
      this.updateStateTag(state.label);

      if (state.bite) {
        this.tweens.add({
          targets: this.handFoodSlot,
          scaleX: 0.1,
          scaleY: 0.1,
          alpha: 0,
          duration: 90,
          onComplete: () => this.handFoodSlot.setVisible(false)
        });

        for (let i = 0; i < 6; i++) {
          const spark = this.add.text(
            270 + 26 + Phaser.Math.Between(-18, 18),
            350 - 6 + Phaser.Math.Between(-16, 16),
            '✨',
            { fontSize: '13px' }
          ).setOrigin(0.5).setDepth(30);

          this.tweens.add({
            targets: spark,
            x: spark.x + Phaser.Math.Between(-28, 28),
            y: spark.y + Phaser.Math.Between(-24, 18),
            alpha: 0,
            scale: 0.2,
            duration: 360,
            onComplete: () => spark.destroy()
          });
        }
      }

      if (state.reaction) {
        const heart = this.add.text(270, 240, '💖', { fontSize: '24px' }).setOrigin(0.5).setDepth(40);
        this.tweens.add({
          targets: heart,
          y: 200,
          scale: 1.3,
          alpha: 0,
          duration: 600,
          onComplete: () => heart.destroy()
        });
      }

      this.tweens.add({
        targets: this.chef,
        scaleX: step === 2 ? 1.5 : 1.42,
        scaleY: step === 2 ? 1.34 : 1.42,
        duration: state.ms / 2,
        yoyo: true
      });

      step++;
      if (step < CHEF_FLOW.length) {
        this.time.delayedCall(state.ms, run);
      } else {
        this.busy = false;
        this.addProgress(food[3]);
      }
    };
    run();
  }

  addProgress(gain) {
    const prevProgress = this.progress;
    this.progress = Math.min(600, this.progress + gain);

    const targetWidth = 412 * this.progress / 600;
    const currentObj = { w: 412 * prevProgress / 600 };
    this.tweens.add({
      targets: currentObj,
      w: targetWidth,
      duration: 260,
      onUpdate: () => this.renderEmotionFill(currentObj.w)
    });

    const pct = Math.round(this.progress / 6);
    this.emotionText.setText(`😋 Hài lòng: ${pct}%`);
    this.pushComment();

    if (this.progress >= 600) this.finish();
  }

  showGift() {
    if (this.progress >= 600 || this.giftContainer) return;

    const gx = 440, gy = 140;
    this.giftContainer = this.add.container(gx, gy).setScale(0.2).setAlpha(0).setDepth(30);

    const shadow = this.add.rectangle(0, 4, 114, 84, 0x223040, 0.35);
    const bg = this.add.rectangle(0, 0, 114, 84, 0xfff1cf).setStrokeStyle(3, 0xe16870);
    const tx = this.add.text(0, -16, '🎁 GIFT +50', { fontFamily: 'Arial Black', fontSize: '13px', color: '#8d3d46' }).setOrigin(0.5);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xd95e6a, 1).fillRoundedRect(-32, 6, 64, 26, 13);
    const btnText = this.add.text(0, 19, 'NHẬN', { fontFamily: 'Arial Black', fontSize: '11px', color: '#fff' }).setOrigin(0.5);

    const btn = this.add.container(0, 0, [btnBg, btnText]).setSize(64, 26).setInteractive({ useHandCursor: true });

    this.giftContainer.add([shadow, bg, tx, btn]);

    this.tweens.add({ targets: this.giftContainer, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });

    btn.on('pointerup', () => {
      this.coin += 50;
      const flyText = this.add.text(gx, gy, '🪙 +50', {
        fontFamily: 'Arial Black', fontSize: '16px', color: '#d58b28'
      }).setOrigin(0.5).setDepth(60);

      this.tweens.add({
        targets: flyText,
        y: gy - 40,
        alpha: 0,
        duration: 700,
        onComplete: () => flyText.destroy()
      });

      this.tweens.add({
        targets: this.giftContainer,
        scale: 0.1,
        alpha: 0,
        duration: 180,
        onComplete: () => {
          this.giftContainer.destroy();
          this.giftContainer = null;
          this.time.delayedCall(4500, () => this.showGift());
        }
      });
    });
  }

  finish() {
    this.busy = true;
    this.chef.setFrame(6);
    this.updateStateTag('HOÀN THÀNH');

    const p = this.add.container(270, 470).setDepth(100).setScale(0.2);
    const bg = this.add.rectangle(0, 0, 410, 235, 0xfff2cf).setStrokeStyle(7, 0xdd6672);
    const title = this.add.text(0, -72, 'MUKBANG HOÀN THÀNH!', { fontFamily: 'Arial Black', fontSize: '22px', color: '#8c3f46' }).setOrigin(0.5);
    const reward = this.add.text(0, -18, `🪙 +${100 + this.coin} COIN`, { fontFamily: 'Arial Black', fontSize: '27px', color: '#d58b28' }).setOrigin(0.5);
    const again = this.add.text(0, 55, 'CHƠI LẠI', { fontFamily: 'Arial Black', fontSize: '17px', color: '#fff', backgroundColor: '#dc6470', padding: { x: 22, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    p.add([bg, title, reward, again]);
    again.on('pointerup', () => this.scene.restart());
    this.tweens.add({ targets: p, scale: 1, duration: 350, ease: 'Back.easeOut' });
  }
}

window.__mukbangGame = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: W,
  height: H,
  scene: Mukbang,
  render: { antialias: true, roundPixels: true },
  fps: { target: 60, min: 30 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
});
