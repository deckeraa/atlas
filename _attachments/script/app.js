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

    // New Task Form
    $("#new-task").submit( function (e) {
        e.preventDefault();

        var form = this;
        var doc = $(form).serializeObject();
        doc._id = createUUID();
        delete doc._rev;

        db.saveDoc( doc, {success: function(status) {
            form.reset();
        }});
        return false;
    });

    function drawItems() {
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
    };
//    drawItems();
    var changesRunning = false;
    function setupChanges(since) {
        if (!changesRunning) {
            var changeHandler = db.changes(since);
            changesRunning = true;
            changeHandler.onChange(drawItems);
        }
    }
    $.couchProfile.templates.profileReady = $("#new-message").html();
    $("#account").couchLogin({
        loggedIn : function(r) {
            $("#profile").couchProfile(r, {
                profileReady : function(profile) {
                    $("#create-message").submit(function(e){
                        e.preventDefault();
                        var form = this, doc = $(form).serializeObject();
                        doc.created_at = new Date();
                        doc.profile = profile;
                        db.saveDoc(doc, {success : function() {form.reset();}});
                        return false;
                    }).find("input").focus();
                }
            });
        },
        loggedOut : function() {
            $("#profile").html('<p>Please log in to see your profile.</p>');
        }
    });
 });
