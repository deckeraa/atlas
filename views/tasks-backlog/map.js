function(doc) {
    if (doc.type == "task" && doc.column == "backlog") {
        emit(doc.position,doc);
    }
};
