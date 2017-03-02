function scrollDown() {
    $('html,body').animate({
        scrollTop: $(".scroll-down-to").offset().top},
        'slow');
};