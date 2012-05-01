define(['link/tint', 'text!templates/message.html', function(Tint, messageHtml) {

    // Message
    // =======
    var Message = Tint.compile(messageHtml, function(message) {
        this.subject(message.subject);
        this.date(new Date(message.date).toLocaleDateString());
        this.time(new Date(message.date).toLocaleTimeString());
        this.author(message.author);
        for (var i=0; i < message.recp.length; i++) {
            if (i < message.recp.length - 1) {
                this.recp().add(message.recp[i]);
            } else {
                this.recp().last(message.recp[i]);
            }
        }
        this.addRecipients(message.recp);
        this.body(message.body);
    });

    // Export
    return {
        Message:Message
    };
});