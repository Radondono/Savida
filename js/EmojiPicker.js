var EmojiPicker = {
    categories: {
        "Faces": ["😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👻","👽","🤖"],
        "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️"],
        "People": ["👩","👨","👧","👦","👶","👵","👴","🧑","👮","👷","💂","🕵️","👰","🤵","👸","🤴","🧙","🧚","🧛","🧜","🧝"],
        "Body": ["💪","🦵","🦶","👂","👃","🧠","🫀","👀","👁️","👅","👄","💋"],
        "Clothing": ["👗","👘","👙","👚","👕","👖","👔","👢","👠","👟","🧥","👒","🎩","🧢","👑","💍","🕶️"],
        "Actions": ["💃","🕺","🛀","🧘","🧎","🤸","🤾","🏋️","🚴","🤼","🤹","🧗"],
        "Objects": ["🔞","⚠️","🚫","⛔","🔒","🔓","🔑","⛓️","💉","🔪","🗡️","🛡️","🔗","💊","🩹","🩸","📸","📹","🎥","📱","💻"],
        "Symbols": ["⭐","🌟","✨","💫","🔥","💥","💢","💦","💨","🕳️","💣","💬","🗯️","💭","🌈","💯","✅","❌","⚜️","🔱"],
        "Places": ["🏠","🏡","🏢","🏚️","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏰","🏯","💒","⛪","🎪","🎭","🎤","🎬","🎨","🚪","🛏️","🚿","🛁"],
        "Weather": ["☀️","🌤️","⛅","☁️","🌧️","⛈️","🌩️","❄️","☃️","🌈","☔","⚡"],
        "Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐴","🦄","🐝","🦋","🐍","🐢","🐙","🦑","🐬","🐳","🦈"],
        "Plants": ["🌵","🎄","🌲","🌳","🌴","🌱","🌿","🍀","🎍","🍄","🌾","💐","🌷","🌹","🌸","🌼","🌻"]
    },

    open: function(targetId, event) {
        var picker = document.getElementById('emoji-picker');
        if (!picker) return;
        var html = '';
        var self = this;
        Object.keys(this.categories).forEach(function(cat) {
            html += '<div class="emoji-cat">' + cat + '</div><div>';
            self.categories[cat].forEach(function(emoji) {
                html += '<button class="emoji-btn" onclick="EmojiPicker.pick(\'' + targetId + '\',\'' + emoji + '\')">' + emoji + '</button>';
            });
            html += '</div>';
        });
        picker.innerHTML = html;
        picker.style.display = 'block';
        picker.style.left = Math.min(event.clientX, window.innerWidth - 340) + 'px';
        picker.style.top = Math.min(event.clientY, window.innerHeight - 370) + 'px';
        event.stopPropagation();
    },

    pick: function(targetId, emoji) {
        var el = document.getElementById(targetId);
        if (el) { el.value = emoji; el.dispatchEvent(new Event('change')); }
        var picker = document.getElementById('emoji-picker');
        if (picker) picker.style.display = 'none';
    },

    close: function() {
        var picker = document.getElementById('emoji-picker');
        if (picker) picker.style.display = 'none';
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('#emoji-picker') && !e.target.closest('.emoji-trigger')) {
        EmojiPicker.close();
    }
});