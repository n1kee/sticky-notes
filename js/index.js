
const NOTES_APP = new NotesApp("#notes");
const NOTES_STORAGE = new NotesStorage;
const API = new RestApi;
const $BIN = $("#bin");
const showSaveBtn = show => $("#save-notes").prop("disabled", show === false);
// Saves notes over the localStorage.
const saveNotesLocally = immediately => NOTES_STORAGE.save(NOTES_APP.getNotes(), NOTES_APP.updateDate.toISOString(), immediately);
// Saves notes over the REST API.
const saveNotesOnServer = notes => {
    API.saveNotes(NOTES_APP.getNotes()).then(notesData => NOTES_APP.setNotes(notesData));
};

NOTES_APP.onNoteChange = note => {
    saveNotesLocally();
    showSaveBtn();
};

NOTES_APP.onNoteMove = note => {
    const $note = NOTES_APP.$draggingNote;
    // Resizes the bin in on order to make note overlapping with the bin more visible.
    const binSizeCoeff = .2;
    const binOffset = $BIN.offset();
    const noteOffset = $note.offset();

    const rectOverlap = checkRectanglesOverlap(
        {
            x: noteOffset.left,
            y: noteOffset.top,
            width: note.width(),
            height: note.height(),
        },
        {
            x: binOffset.left,
            y: binOffset.top,
            width: $BIN.width(),
            height: $BIN.height(),
            scale: .1,
        }
    );
    if (rectOverlap) NOTES_APP.deleteFocusedNote();
    showSaveBtn();
};

// Creates a new note.
$('#creation-form').submit(function(evt) {
    const newNoteCfg = {};
    $(this).serializeArray().forEach(field => newNoteCfg[ field.name ] = +field.value);
    NOTES_APP.addNote(newNoteCfg);
    evt.preventDefault();
});

$(document).ready(function() {
    // Displays notes saved in the localStorage or from the REST API if they are newer.
    let notesData = NOTES_STORAGE.get();
    API.getNotes(notesData?.updatedAt).then(res => {
        if (res.code === 200) {
            notesData = res;
            NOTES_STORAGE.save(res.notes, res.updatedAt);
        }
        const hasUpdateNotes = notesData.notes.find(note => note.isModified);
        if (hasUpdateNotes) showSaveBtn();
        NOTES_APP.setNotes(notesData);
    }, err => {
        alert(`Error: ${err.name} ${err.message}`);
    });
});

// Saves the notes before the tab closes.
$(window).on("unload", () => saveNotesLocally(true));

document.addEventListener("mousedown", function (evt) {
    NOTES_APP.onMouseDown(evt);
});

document.addEventListener("mouseup", function (evt) {
    NOTES_APP.onMouseUp(evt);
});

document.addEventListener("mousemove", function (evt) {
    NOTES_APP.onMouseMove(evt);
});

document.addEventListener("click", function (evt) {
    if ($(evt.target).is("#save-notes")) {
        showSaveBtn(false);
        saveNotesOnServer();
    }
});

document.addEventListener("keyup", function (evt) {
    NOTES_APP.onKeyUp(evt);
});
