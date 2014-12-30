// Apache 2.0 J Chris Anderson 2011
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

    var path = unescape(document.location.pathname).split('/');
    var design = path[3];
    var db = $.couch.db(path[1]);

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

    // colname is the name of the corresponding view
    // col_title is what gets displayed to the user
    // example: buildKanbanColumn("backlog", "Backlog");
    function buildKanbanColumn(colname, col_title) {
        var this_fn = function(){ buildKanbanColumn(colname,col_title); }; // used for setupChanges
        db.view(design + "/tasks-" + colname, {
            update_seq: true,
            success : function (data) {
                setupChanges(data.update_seq, this_fn);
                data.col_name = col_title;
                var template = Handlebars.compile( $("#kanban-column").html() );
                
                $("#" + colname + "-div").html( template(data) );
            }
        });

    }

    var cols_bf = ["backlog","doing","qa", "done"]; // back-facing
    var cols_ff = ["Backlog","Doing","Q/A","done"]; // front-facing

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

    for( var i in cols_bf ) {
        buildKanbanColumn( cols_bf[i], cols_ff[i] );
    }

/*    buildKanbanColumn("backlog", "Backlog");
    buildKanbanColumn("doing", "Doing");
    buildKanbanColumn("qa", "Q/A");
    buildKanbanColumn("done", "Done");*/

    var changesRunning = false;
    function setupChanges(since, onChangeFn) {
        if (!changesRunning) {
            var changeHandler = db.changes(since);
            changesRunning = true;
            changeHandler.onChange( onChangeFn );
        }
    }
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
