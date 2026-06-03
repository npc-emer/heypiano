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
    var WHITE_KEY_WIDTH = 38;
    var WHITE_KEY_GAP = 1;
    var BLACK_KEY_WIDTH = 24;
    var OCTAVE_SHIFT_MIN = -2;
    var OCTAVE_SHIFT_MAX = 2;
    var keyToBaseNote = {};

    // 白键按钢琴顺序排列；黑键通过 afterWhiteNote 挂在对应白键右侧
    var whiteLayout = [
      { note: "C3", label: "Z", row: "z" },
      { note: "D3", label: "X", row: "z" },
      { note: "E3", label: "C", row: "z" },
      { note: "F3", label: "V", row: "z" },
      { note: "G3", label: "B", row: "z" },
      { note: "A3", label: "N", row: "z" },
      { note: "B3", label: "M", row: "z" },
      { note: "C4", label: "A", row: "a" },
      { note: "D4", label: "S", row: "a" },
      { note: "E4", label: "D", row: "a" },
      { note: "F4", label: "F", row: "a" },
      { note: "G4", label: "G", row: "a" },
      { note: "A4", label: "H", row: "a" },
      { note: "B4", label: "J", row: "a" },
      { note: "C5", label: "K", row: "a" },
      { note: "D5", label: "L", row: "a" },
      { note: "E5", label: ";", row: "a" },
      { note: "F5", label: "'", row: "a" },
      { note: "G5", label: "W", row: "q" },
      { note: "A5", label: "E", row: "q" },
      { note: "B5", label: "R", row: "q" },
      { note: "C6", label: "T", row: "q" },
      { note: "D6", label: "Y", row: "q" },
      { note: "E6", label: "U", row: "q" },
      { note: "F6", label: "I", row: "q" },
      { note: "G6", label: "O", row: "q" },
      { note: "A6", label: "P", row: "q" },
      { note: "B6", label: "Q", row: "q" },
    ];

    var blackLayout = [
      { note: "C#3", label: "1", row: "digit", afterWhiteNote: "C3" },
      { note: "D#3", label: "2", row: "digit", afterWhiteNote: "D3" },
      { note: "F#3", label: "4", row: "digit", afterWhiteNote: "F3" },
      { note: "G#3", label: "5", row: "digit", afterWhiteNote: "G3" },
      { note: "A#3", label: "6", row: "digit", afterWhiteNote: "A3" },
      { note: "C#4", label: "3", row: "digit", afterWhiteNote: "C4" },
      { note: "D#4", label: "7", row: "digit", afterWhiteNote: "D4" },
      { note: "F#4", label: "8", row: "digit", afterWhiteNote: "F4" },
      { note: "G#4", label: "9", row: "digit", afterWhiteNote: "G4" },
      { note: "A#4", label: "0", row: "digit", afterWhiteNote: "A4" },
      { note: "C#5", label: "-", row: "digit", afterWhiteNote: "C5" },
      { note: "D#5", label: "=", row: "digit", afterWhiteNote: "D5" },
      { note: "F#5", label: "[", row: "digit", afterWhiteNote: "F5" },
      { note: "G#5", label: "]", row: "digit", afterWhiteNote: "G5" },
      { note: "A#5", label: "\\", row: "digit", afterWhiteNote: "A5" },
      { note: "C#6", label: "`", row: "digit", afterWhiteNote: "C6" },
      { note: "D#6", label: ",", row: "digit", afterWhiteNote: "D6" },
      { note: "F#6", label: ".", row: "digit", afterWhiteNote: "F6" },
      { note: "G#6", label: "/", row: "digit", afterWhiteNote: "G6" },
    ];

    vm.whiteKeys = [];
    vm.blackKeys = [];
    vm.pressed = {};
    vm.octaveShift = 0;
    vm.octaveShiftMin = OCTAVE_SHIFT_MIN;
    vm.octaveShiftMax = OCTAVE_SHIFT_MAX;
    vm.rangeLabel = "C3 – B6";
    vm.noteDown = noteDown;
    vm.noteUp = noteUp;

    function labelToCode(label) {
      var specials = {
        ";": "Semicolon",
        "'": "Quote",
        ",": "Comma",
        ".": "Period",
        "/": "Slash",
        "[": "BracketLeft",
        "]": "BracketRight",
        "\\": "Backslash",
        "-": "Minus",
        "=": "Equal",
        "`": "Backquote",
      };

      if (specials[label]) {
        return specials[label];
      }

      if (/^\d$/.test(label)) {
        return "Digit" + label;
      }

      return "Key" + label.toUpperCase();
    }

    function whiteStep() {
      return WHITE_KEY_WIDTH + WHITE_KEY_GAP;
    }

    function blackKeyLeft(afterWhiteIndex, pitch) {
      var step = whiteStep();
      var base = afterWhiteIndex * step + WHITE_KEY_WIDTH;

      if (pitch === "D#" || pitch === "A#") {
        return base - BLACK_KEY_WIDTH * 0.88;
      }

      return base - BLACK_KEY_WIDTH * 1.12;
    }

    function pitchName(note) {
      return note.replace(/\d+$/, "");
    }

    var whiteIndexByNote = {};

    whiteLayout.forEach(function (item, index) {
      keyToBaseNote[labelToCode(item.label)] = item.note;
      whiteIndexByNote[item.note] = index;
      vm.whiteKeys.push({
        baseNote: item.note,
        note: item.note,
        label: item.label,
        row: item.row,
      });
    });

    blackLayout.forEach(function (item) {
      var afterIndex = whiteIndexByNote[item.afterWhiteNote];
      if (afterIndex === undefined) {
        return;
      }

      keyToBaseNote[labelToCode(item.label)] = item.note;
      vm.blackKeys.push({
        baseNote: item.note,
        note: item.note,
        label: item.label,
        row: item.row,
        left: blackKeyLeft(afterIndex, pitchName(item.note)),
      });
    });

    function transposeNote(baseNote, octaveShift) {
      var match = baseNote.match(/^([A-G]#?)(\d)$/);
      if (!match) {
        return baseNote;
      }

      var pitch = match[1];
      var octave = parseInt(match[2], 10) + octaveShift;
      if (octave < 0 || octave > 9) {
        return null;
      }

      return pitch + octave;
    }

    function refreshKeyNotes() {
      var lowest = null;
      var highest = null;

      vm.whiteKeys.forEach(function (key) {
        key.note = transposeNote(key.baseNote, vm.octaveShift);
        if (key.note) {
          if (!lowest) {
            lowest = key.note;
          }
          highest = key.note;
        }
      });
      vm.blackKeys.forEach(function (key) {
        key.note = transposeNote(key.baseNote, vm.octaveShift);
        if (key.note && (!highest || key.note > highest)) {
          highest = key.note;
        }
      });

      vm.rangeLabel = lowest && highest ? lowest + " – " + highest : "";
    }

    function releaseAllNotes() {
      Object.keys(vm.pressed).forEach(function (baseNote) {
        if (vm.pressed[baseNote]) {
          noteUp(baseNote);
        }
      });
    }

    function shiftOctave(delta) {
      var next = vm.octaveShift + delta;
      if (next < OCTAVE_SHIFT_MIN || next > OCTAVE_SHIFT_MAX) {
        return false;
      }

      releaseAllNotes();
      vm.octaveShift = next;
      refreshKeyNotes();
      return true;
    }

    function soundingNote(baseNote) {
      return transposeNote(baseNote, vm.octaveShift);
    }

    function noteDown(baseNote) {
      if (vm.pressed[baseNote]) {
        return;
      }

      var note = soundingNote(baseNote);
      if (!note) {
        return;
      }

      AudioService.resume();
      vm.pressed[baseNote] = note;
      AudioService.playNote(note);
    }

    function noteUp(baseNote) {
      var sounding = vm.pressed[baseNote];
      if (!sounding) {
        return;
      }

      vm.pressed[baseNote] = false;
      AudioService.stopNote(sounding);
    }

    function onKeyDown(event) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        if (shiftOctave(-1)) {
          $scope.$apply();
        }
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (shiftOctave(1)) {
          $scope.$apply();
        }
        return;
      }

      var baseNote = keyToBaseNote[event.code];
      if (!baseNote) {
        return;
      }

      event.preventDefault();
      noteDown(baseNote);
      $scope.$apply();
    }

    function onKeyUp(event) {
      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        return;
      }

      var baseNote = keyToBaseNote[event.code];
      if (!baseNote) {
        return;
      }

      event.preventDefault();
      noteUp(baseNote);
      $scope.$apply();
    }

    function onWindowBlur() {
      releaseAllNotes();
      $scope.$apply();
    }

    refreshKeyNotes();

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
