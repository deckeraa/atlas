function(doc) {
    if (doc.type == "task") {
        emit(doc.position,doc);
    }
};
