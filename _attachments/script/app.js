// Atlas
// Personal Kanban/GTD/Analytics

// -------------------- app globals --------------------

// The database object -- will be initialized on jQuery load
var db;

// The kanban columns
var cols_bf = ["backlog","doing","qa", "done"]; // back-facing
var cols_ff = ["Backlog","Doing","Q/A","Done"]; // front-facing

function createUUID() {
    // based off of
    // http://www.ietf.org/rfc/rfc4122.txt
    // but makes couchDB UUIDs
    // instead of rfc 4122 UUIDs
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    return s.join("");
}

function getNextColumn( colname_bf ) {
    var index = cols_bf.indexOf(colname_bf);
    if( index + 1 < cols_bf.length ) {
        return cols_bf[ index + 1 ];
    }
    return null;
}

function getPrevColumn( colname_bf ) {
    var index = cols_bf.indexOf(colname_bf);
    if( index - 1 >= 0 ) {
        return cols_bf[ index-1 ];
    }
    return null;
}

// task_id is the _id of the task
// col_name is the name of the column
// if col_name is "prev", then the previous column is used.
// if col_name is "next, then the next column is used.
// "next" and "previous" are determined off of the column
// that is stored in the document with the associated _id.
function moveTaskToColumn( task_id, col_name ) {
    db.openDoc( task_id, {
        success: function(doc) {
            var col = col_name;
            if( col == "next" ) {
                col = getNextColumn( doc.column );
            }
            if( col == "prev" ) {
                col = getPrevColumn( doc.column );
            }
            doc.column = col;
            db.saveDoc(doc);
        }
    });
}

// TODO add in error checking
/*function moveTaskToNextColumn( task_id ) {
    db.openDoc( task_id, {
        success: function(doc) {
            var next = getNextColumn( doc.column )
            if( next ) {
                doc.column = next;
                db.saveDoc(doc);
            }
        }
    });
}

function moveTaskToPrevColumn( task_id ) {
    db.openDoc( task_id, {
        success: function(doc) {
            var prev = getPrevColumn( doc.column )
            if( prev ) {
                doc.column = prev;
                db.saveDoc(doc);
            }
        }
    });
}*/

function appChangesFn(data) {
    console.log("changes: ", data);
}

$(function() {   
    // friendly helper http://tinyurl.com/6aow6yn
    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function() {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };

    var path = unescape(document.location.pathname).split('/');
    var design = path[3];
    db = $.couch.db(path[1]);

    // set up handlebars helpers
    Handlebars.registerHelper('render-task', function(task) {
        var template = Handlebars.compile( $("#render-task").html() );
        return new Handlebars.SafeString( template(task) );
    } );

    // New Task Form
    $("#new-task").submit( function (e) {
        e.preventDefault();

        var form = this;
        var doc = $(form).serializeObject();
        doc._id = createUUID();
        delete doc._rev;
        doc.column = "backlog";

        db.saveDoc( doc, {success: function(status) {
            form.reset();
        }});
        return false;
    });

/*    function drawItems() {
        db.view(design + "/recent-items", {
            descending : "true",
            limit : 50,
            update_seq : true,
            success : function(data) {
                setupChanges(data.update_seq);
                var them = $.mustache($("#recent-messages").html(), {
                    items : data.rows.map(function(r) {return r.value;})
                });
                $("#content").html(them);
            }
        });
    };*/

/*    var changesRunning = false;
    function setupChanges(since) {
        if (!changesRunning) {
            var changeHandler = db.changes(since);
            changesRunning = true;
            changeHandler.onChange = function (data) { console.log("changes :",data) };
        }
    }*/

    // colname is the name of the corresponding view
    // col_title is what gets displayed to the user
    // example: buildKanbanColumn("backlog", "Backlog");
    function buildKanbanColumn(colname, col_title) {
        var this_fn = function(){ buildKanbanColumn(colname,col_title); }; // used for setupChanges
        db.view(design + "/tasks-" + colname, {
            update_seq: true,
            success : function (data) {
//                setupChanges( data.update_seq );
                data.col_name = col_title;
                var template = Handlebars.compile( $("#kanban-column").html() );
                
                $("#" + colname + "-div").html( template(data) );
            }
        });

    }

    for( var i in cols_bf ) {
        buildKanbanColumn( cols_bf[i], cols_ff[i] );
    }

/*    buildKanbanColumn("backlog", "Backlog");
    buildKanbanColumn("doing", "Doing");
    buildKanbanColumn("qa", "Q/A");
    buildKanbanColumn("done", "Done");*/

   
    var changes = db.changes();
    changes.onChange( appChangesFn );
    changes.onChange( function (data) {
        // TODO not very efficient
        for( var i in cols_bf ) {
            buildKanbanColumn( cols_bf[i], cols_ff[i] );
        }
    });
    /*changes.onChange( function(data) { 
        console.log("changes: ",data);
    });*/

    /*var promise_changes = db.changes();
    promise_changes.onChange( db_changes );
    function db_changes(resp) {
        console.log("db_changes: ", resp);
    }*/

//    $.couchProfile.templates.profileReady = $("#new-message").html();
    $("#account").couchLogin({
        loggedIn : function(r) {
            console.log(r);
            $("#profile").html("Logged in as: " + r.userCtx.name);
            // $("#profile").couchProfile(r, {
            //     profileReady : function(profile) {
            //     }
            // });
        },
        loggedOut : function() {
            $("#profile").html('<p>Please log in to see your profile.</p>');
        }
    });
 });
