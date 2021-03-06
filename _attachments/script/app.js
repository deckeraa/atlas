// Atlas
// Personal Kanban/GTD/Analytics

// -------------------- app globals --------------------

// The database object -- will be initialized on jQuery load
var db;
var tasks = {};

// The kanban columns
var cols_bf = ["backlog","waiting","doing","qa", "done"]; // back-facing
var cols_ff = ["Backlog","Waiting","Doing","Q/A","Done"]; // front-facing

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
            if( col != null ) {
                doc.column = col;
                db.saveDoc(doc);
            }
        }
    });
}


/*function colorTaskByDueDate( task_div_selector ) {
    var data_html = task_div_selector.find(".due").html();
    if( data_html ) {
        var due = new Date( data_html );
        var now = new Date();
        // count how many days out
        // (convert from milliseconds)
        // 24*60*60*1000
        var days = (due - now) / 86400000;
        if(days < 1) {
            task_div_selector.css('background-color', 'lightpink');
        }
        else if (days < 3) {
            task_div_selector.css('background-color', 'yellow');
        }
    }
}*/

function colorTaskByDueDate( task_id  ) {
//    var data_html = task_div_selector.find(".due").html();
    var task = tasks[ task_id ];
    if( task && task.column != 'done' && task.due ) {
        var task_div_selector = $("#"+task_id);
        var due = new Date( task.due );
        var now = new Date();
        // count how many days out
        // (convert from milliseconds)
        // 24*60*60*1000
        var days = (due - now) / 86400000;
        if(days < 1) {
            task_div_selector.css('background-color', 'lightpink');
        }
        else if (days < 3) {
            task_div_selector.css('background-color', 'yellow');
        }
    }
}

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

    // colname is the name of the corresponding view
    // col_title is what gets displayed to the user
    // example: buildKanbanColumn("backlog", "Backlog");
    function buildKanbanColumn(col_view_data, colname, col_title) {
        // generate the column via handlebars template in index.html
        col_view_data.col_name = col_title;

        // eliminate old tasks from DOM (avoid duplicate id's)
        for( var i in col_view_data.rows ){
            $("#"+col_view_data.rows[i].id).remove();
        }
        
        // build the new column and add to DOM
        var template = Handlebars.compile($("#kanban-column").html());
        var col_div = $("#" + colname + "-div");
        col_div.html( template(col_view_data) );

        // color the tasks
        for( var i in col_view_data.rows ) {
            colorTaskByDueDate( col_view_data.rows[i].id );
        }
    }

    // make a bunch of calls to the views for tasks
    function reloadAllTasks() {
        for( var i in cols_bf ) {
//            $("#"+ cols_bf[i] + "-div").html("");
            (function () {
                var col_bf = cols_bf[i];
                var col_ff = cols_ff[i];
                db.view(design + "/tasks-" + cols_bf[i], {
                    update_seq: true,
                    success : function (col_view_data) {
                        for( var i in col_view_data.rows) {
                            tasks[ col_view_data.rows[i].id ] = col_view_data.rows[i].value;
                        }
                        buildKanbanColumn( col_view_data, col_bf, col_ff );
                    }});
            }());
        }
    }

    reloadAllTasks();

    var changes = db.changes();
    changes.onChange( appChangesFn );
    changes.onChange( function (data) {
        reloadAllTasks();
    });

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
