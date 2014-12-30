function(doc) {
    if (doc.type == "task" && doc.column == "doing") {
        emit(doc.position,doc);
    }
};
