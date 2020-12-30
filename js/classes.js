
class NoteElement extends HTMLDivElement {

    isModified = false;
    isDeleted = false;

    constructor(cfg) {
        super(cfg);
        this.dbId = cfg.id;
        this.setPosition(cfg.x, cfg.y);
        this.isModified = cfg.isModified;
        this.isDeleted = cfg.isDeleted;
        this.style.zIndex = cfg.zIndex;
        this.style.width = (cfg.width || this.style.width) + "px";
        this.style.height = (cfg.height || this.style.height) + "px";
        this.borderColor = cfg.borderColor;

        const addBorder = (borderCfg, cls, bgColor) => {
            const border = document.createElement("div");
            border.dataset.xCoeff = borderCfg.xCoeff;
            border.dataset.yCoeff = borderCfg.yCoeff;
            if (bgColor) border.style.backgroundColor = `rgb(${bgColor})`;
            border.classList.add(cls);
            border.classList.add(`${cls}__${borderCfg.name}`);
            this.appendChild(border);
        }

        // Borders resize coefficients.
        [
            { name: "top", xCoeff: 0, yCoeff: -1 },
            { name: "left", xCoeff: -1, yCoeff: 0 },
            { name: "bottom", xCoeff: 0, yCoeff: 1 },
            { name: "right", xCoeff: 1, yCoeff: 0 },
        ].forEach(borderCfg => addBorder(borderCfg, "note-border", this.borderColor));
        [
            { name: "tl", xCoeff: -1, yCoeff: -1 },
            { name: "tr", xCoeff: 1, yCoeff: -1 },
            { name: "bl", xCoeff: -1, yCoeff: 1 },
            { name: "br", xCoeff: 1, yCoeff: 1 },
        ].forEach(borderCfg => addBorder(borderCfg, "note-corner"));

        const txtarea = $("<textarea class='note-content'></textarea>");
        if (cfg.text) txtarea.val(cfg.text);
        this.appendChild($(txtarea)[0]);
    }

    setPosition(x, y) {
        this.style.top = `${y}px`;
        this.style.left = `${x}px`;
    }

    getData() {
        return {
            id: this.dbId,
            x: this.offsetLeft,
            y: this.offsetTop,
            width: this.offsetWidth,
            height: this.offsetHeight,
            text: this.querySelector("textarea").value,
            isModified: !!this.isModified,
            isDeleted: !!this.isDeleted,
            zIndex: +this.style.zIndex,
            borderColor: this.borderColor.match(/\d+(,\s*\d+){2}/)[ 0 ],
        };
    }

    move(x, y) {
        this.setPosition(x - this.offsetWidth / 2, y - this.offsetHeight / 2);
    }
}

class RestApi {

    updateDate = new Date("05 April 2001 14:48 UTC");
    idPointer = 1;

    notes = [
        {
            id: 0,
            x: 75,
            y: 50,
            text: "Go shopping",
            zIndex: 0,
            borderColor: "65,36,01",
        }, {
            id: 1,
            x: 100,
            y: 135,
            text: "Read a book",
            zIndex: 0,
            borderColor: "124,45,62",
        },
    ]

    saveNotes(notes) {
        return new Promise(next => {
            setTimeout(() => {
                // Creates, deletes, updates notes.
                this.notes = notes
                    .sort((n1, n2) => n1.zIndex - n2.zIndex)
                    .filter((note, idx) => {
                        if (note.isDeleted) return false;
                        if (note.id === undefined) note.id = ++this.idPointer;
                        note.isModified = false;
                        note.isDeleted = false;
                        note.zIndex = idx;
                        return true;
                    });
                this.updateDate = new Date();
                this.getNotes().then(notesData => next(notesData));
            }, 0);
        });
    }

    getNotes(date) {
        return new Promise(next => {
            setTimeout(() => {
                // Returns notes if they are newer then the date provided.
                if (!date || (this.updateDate > new Date(date))) {
                    next({
                        code: 200,
                        notes: this.notes,
                        updatedAt: this.updateDate.toISOString(),
                    });
                } else {
                    next({
                        code: 304,
                        notes: null,
                        updatedAt: this.updateDate.toISOString(),
                    });
                }
            }, 0);
        });
    }
}

customElements.define('dnd-note', NoteElement, { extends: 'div' });

class NotesApp {

    $focusedNote;
    $draggingNote;
    dragTarget;
    $dragTarget;
    focusedNoteInitialValues;
    maxZindex = 0;
    updateDate;
    notesElements = [];
    selector = "body";
    noteSeletor = ".note";
    prevMouseMoveEvt;

    _onNoteChange = note => {};
    _onNoteMove = note => {};

    constructor(selector, noteSeletor) {
        this.selector = selector || this.selector;
        this.noteSeletor = noteSeletor || this.noteSeletor;
        this.$container = $(this.selector);
    }

    handleNoteUpdate(note) {
        this.updateDate = new Date;
        note.isModified = true;
    }

    set onNoteChange(cb) {
        this._onNoteChange = note => {
            this.handleNoteUpdate(note);
            cb(note);
        };
    }

    set onNoteMove(cb) {
        this._onNoteMove = note => {
            this.handleNoteUpdate(note);
            cb(note);
        };
    }

    get onNoteChange() {
        return this._onNoteChange;
    }

    get onNoteMove() {
        return this._onNoteMove;
    }

    // Replaces old notes with the new ones.
    setNotes(notesData) {
        this.updateDate = new Date(notesData.updatedAt);
        let $oldContainer;
        if (this.notesElements.length) {
            $oldContainer = this.$container;
            this.notesElements = [];
            this.$container = $(this.$container[0].cloneNode());
        }
        (notesData.notes || []).forEach(noteData => {
            this.addNote(noteData);
            if (noteData.zIndex > this.maxZindex) this.maxZindex = noteData.zIndex;
        });
        $oldContainer?.replaceWith(this.$container);
    }

    dragNote(target) {
        const $target = $(target);
        this.draggingNote = $target.closest(this.noteSeletor)[0];
        this.$draggingNote = $(this.draggingNote);
        // Remove text selection in order to stop the text from dragging instead of the note.
        document.getSelection().removeAllRanges();
    }

    // Sets focused note and it's inital values.
    focusNote(target) {
        const $target = $(target);
        this.focusedNote = $target.closest(this.noteSeletor)[0];
        this.$focusedNote = $(this.focusedNote);
        if (this.focusedNote) {
            this.focusedNoteInitialValues = {
                width: this.focusedNote.offsetWidth,
                height: this.focusedNote.offsetHeight,
                zIndex: this.$focusedNote.css("z-index"),
            };
            this.$focusedNote.css("z-index", ++this.maxZindex);
            this.onNoteChange(this.focusedNote);
        } else {
            this.unFocusNote();
        }
        return this.focusedNote;
    }

    unFocusNote() {
        this.focusedNote = this.$focusedNote = this.focusedNoteInitialValues = null;
    }

    deleteFocusedNote() {
        if (!this.focusedNote) return;
        this.$focusedNote.remove();
        this.stopDraggingNote();
        this.onNoteChange(this.focusedNote);
        this.focusedNote.isDeleted = true;
        this.unFocusNote();
    }

    setDragTarget(target) {
        this.dragTarget = target;
        this.$dragTarget = this.dragTarget ? $(this.dragTarget) : null;
        if (!this.dragTarget) this.stopDraggingNote();
    }

    addNote(noteData) {
        if (noteData.zIndex === undefined) noteData.zIndex = this.maxZindex++;
        // Generates a random and unique border color.
        let borderColor = noteData.borderColor;
        if (!borderColor) {
            do {
                borderColor = [ null, null, null ].map(num => Math.floor((Math.random() * 256) + 1)).join(",");
            } while (this.notesElements.find(note => note.borderColor === borderColor));
        }
        noteData.borderColor = borderColor;
        const note = new NoteElement(noteData);
        note.classList.add("note");
        this.notesElements.push(note);
        if (!noteData.isDeleted) this.$container[0].appendChild(note);
        return note;
    }

    getNotes() {
        return this.notesElements.map(noteElem => noteElem.getData());
    }

    stopDraggingNote() {
        if (this.draggingNote) {
            this.onNoteChange(this.draggingNote);
            this.draggingNote = this.$draggingNote = null;
        }
    }

    // Gets a position relative to the parent node.
    getRelativePosition(evt) {
        return {
            x: Math.max(evt.pageX - this.$container[0].offsetLeft, 0),
            y: Math.max(evt.pageY - this.$container[0].offsetTop, 0),
        };
    }

    onMouseMove(evt) {
        if (this.dragTarget && this.$dragTarget.is(".note-border, .note-corner")) {
            // Handle note resizing.
            this.stopDraggingNote();
            const dragTargetPosition = this.dragTarget.getBoundingClientRect();
            const xMoveCoeff = + this.$dragTarget.data("xCoeff");
            const yMoveCoeff = + this.$dragTarget.data("yCoeff");
            const xOffset = evt.pageX - ( this.prevMouseMoveEvt ? this.prevMouseMoveEvt.pageX : dragTargetPosition.left );
            const yOffset = evt.pageY - ( this.prevMouseMoveEvt ? this.prevMouseMoveEvt.pageY : dragTargetPosition.top );
            const addWidth = xOffset * xMoveCoeff;
            const addHeight = yOffset * yMoveCoeff;
            const newWidth = this.$focusedNote.width() + addWidth;
            const newHeight = this.$focusedNote.height() + addHeight;
            if (xMoveCoeff < 0) this.$focusedNote.css("left", parseFloat(this.$focusedNote.css("left")) - addWidth);
            if (yMoveCoeff < 0) this.$focusedNote.css("top", parseFloat(this.$focusedNote.css("top")) - addHeight);
            this.$focusedNote.width(newWidth);
            this.$focusedNote.height(newHeight);
        } else if (this.draggingNote) {
            // Handle note dragging.
            const cursorPosition = this.getRelativePosition(evt);
            this.focusedNote.move(cursorPosition.x, cursorPosition.y);
            this.onNoteMove(this.$focusedNote);
        }
        this.prevMouseMoveEvt = evt;
    }

    onMouseUp(evt) {
        this.setDragTarget(null);
    }

    onMouseDown(evt) {
        this.setDragTarget(evt.target);
        if (!this.$dragTarget.closest(this.selector).length) return;
        if (this.focusNote(evt.target)) {
            this.dragNote(evt.target);
        } else {
            // Creates a note.
            let borderColor;
            const cursorPosition = this.getRelativePosition(evt);
            const newNote = this.addNote({
                x: cursorPosition.x,
                y: cursorPosition.y,
            });
            this.onNoteChange(newNote);
            this.unFocusNote();
        }
    }

    onKeyUp(evt) {
        if (this.focusedNote) this.onNoteChange(this.focusedNote);
    }
}

// Saves notes to the localStorage.
class NotesStorage {

    key = "notes";
    // localStorage update interval.
    interval;
    saveTimeout;

    constructor(interval) {
        this.interval = interval || 1000;
    }

    get() {
        return JSON.parse(localStorage.getItem(this.key));
    }

    save(notes, updatedAt, immediately) {
        if (!immediately && this.saveTimeout) return;
        const cb = () => this.saveHandler(notes, updatedAt);
        if (immediately) {
            cb();
        } else {
            this.saveTimeout = setTimeout(cb, this.interval);
        }
    }

    saveHandler(notes, updatedAt) {
        localStorage
            .setItem(this.key, JSON.stringify({
                notes,
                updatedAt
            }));
        this.saveTimeout = null;
    }
}
