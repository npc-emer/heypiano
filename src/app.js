(function () {
  "use strict";

  angular.module("heypiano", []).factory("AudioService", function () {
    var audioCtx = null;
    var activeNotes = {};
    var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    function getContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioCtx;
    }

    function noteFrequency(noteName) {
      var match = noteName.match(/^([A-G]#?)(\d)$/);
      if (!match) {
        return 440;
      }

      var note = match[1];
      var octave = parseInt(match[2], 10);
      var semitone = NOTE_NAMES.indexOf(note) + (octave + 1) * 12;
      return 440 * Math.pow(2, (semitone - 69) / 12);
    }

    function playNote(noteName) {
      if (activeNotes[noteName]) {
        return;
      }

      var ctx = getContext();
      var freq = noteFrequency(noteName);
      var now = ctx.currentTime;

      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 2;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      activeNotes[noteName] = {
        osc1: osc1,
        osc2: osc2,
        gain: gain,
        ctx: ctx,
      };
    }

    function stopNote(noteName) {
      var active = activeNotes[noteName];
      if (!active) {
        return;
      }

      var ctx = active.ctx;
      var now = ctx.currentTime;

      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(active.gain.gain.value, now);
      active.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      active.osc1.stop(now + 0.15);
      active.osc2.stop(now + 0.15);
      delete activeNotes[noteName];
    }

    return {
      playNote: playNote,
      stopNote: stopNote,
      resume: function () {
        return getContext().resume();
      },
    };
  });

  angular.module("heypiano").controller("PianoCtrl", function ($scope, AudioService, $window) {
    var vm = this;
    var WHITE_KEY_WIDTH = 56;
    var keyToNote = {};
    var noteToKey = {};

    var layout = [
      { note: "C4", type: "white", label: "A" },
      { note: "C#4", type: "black", label: "W", afterWhite: 0 },
      { note: "D4", type: "white", label: "S" },
      { note: "D#4", type: "black", label: "E", afterWhite: 1 },
      { note: "E4", type: "white", label: "D" },
      { note: "F4", type: "white", label: "F" },
      { note: "F#4", type: "black", label: "T", afterWhite: 3 },
      { note: "G4", type: "white", label: "G" },
      { note: "G#4", type: "black", label: "Y", afterWhite: 4 },
      { note: "A4", type: "white", label: "H" },
      { note: "A#4", type: "black", label: "U", afterWhite: 5 },
      { note: "B4", type: "white", label: "J" },
      { note: "C5", type: "white", label: "K" },
      { note: "C#5", type: "black", label: "O", afterWhite: 7 },
      { note: "D5", type: "white", label: "L" },
      { note: "D#5", type: "black", label: "P", afterWhite: 8 },
      { note: "E5", type: "white", label: ";" },
      { note: "F5", type: "white", label: "'" },
    ];

    vm.whiteKeys = [];
    vm.blackKeys = [];
    vm.pressed = {};
    vm.noteDown = noteDown;
    vm.noteUp = noteUp;

    layout.forEach(function (item) {
      var code;

      if (item.label === ";") {
        code = "Semicolon";
      } else if (item.label === "'") {
        code = "Quote";
      } else {
        code = "Key" + item.label.toUpperCase();
      }

      keyToNote[code] = item.note;
      noteToKey[item.note] = code;

      if (item.type === "white") {
        vm.whiteKeys.push({ note: item.note, label: item.label });
      } else {
        vm.blackKeys.push({
          note: item.note,
          label: item.label,
          left: item.afterWhite * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH * 0.72,
        });
      }
    });

    function noteDown(note) {
      if (vm.pressed[note]) {
        return;
      }

      AudioService.resume();
      vm.pressed[note] = true;
      AudioService.playNote(note);
    }

    function noteUp(note) {
      if (!vm.pressed[note]) {
        return;
      }

      vm.pressed[note] = false;
      AudioService.stopNote(note);
    }

    function onKeyDown(event) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      var note = keyToNote[event.code];
      if (!note) {
        return;
      }

      event.preventDefault();
      noteDown(note);
      $scope.$apply();
    }

    function onKeyUp(event) {
      var note = keyToNote[event.code];
      if (!note) {
        return;
      }

      event.preventDefault();
      noteUp(note);
      $scope.$apply();
    }

    function onWindowBlur() {
      Object.keys(vm.pressed).forEach(function (note) {
        if (vm.pressed[note]) {
          noteUp(note);
        }
      });
      $scope.$apply();
    }

    angular.element($window).on("keydown", onKeyDown);
    angular.element($window).on("keyup", onKeyUp);
    angular.element($window).on("blur", onWindowBlur);

    $scope.$on("$destroy", function () {
      angular.element($window).off("keydown", onKeyDown);
      angular.element($window).off("keyup", onKeyUp);
      angular.element($window).off("blur", onWindowBlur);
    });
  });
})();
