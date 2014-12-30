function(doc) {
    if (doc.type == "task" && doc.column == "done") {
        emit(doc.position,doc);
    }
};
