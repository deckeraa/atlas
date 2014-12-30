function(doc) {
    if (doc.type == "task" && doc.column == "qa") {
        emit(doc.position,doc);
    }
};
