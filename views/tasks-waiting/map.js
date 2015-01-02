function(doc) {
    if (doc.type == "task" && doc.column == "waiting") {
        emit(doc.position,doc);
    }
};
