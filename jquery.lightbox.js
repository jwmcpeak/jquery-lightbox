/**
* jQuery Lightbox
* @author Warren Krewenki
*
* This package is distributed under the BSD license.
* For full license information, see LICENSE.TXT
*
* Based on Lightbox 2 by Lokesh Dhakar (http://www.huddletogether.com/projects/lightbox2/)
*
*
**/

(function ($) {
    var lightbox = {
        /*
        # Initialize the lightbox by creating our html and reading some image data
        # This method is called by the constructor after any click events trigger it
        # You will never call it by itself, to my knowledge.
        */
        initialize: function (options) {
            var opts = options;

            this.opts = options;

            $('#overlay, #lightbox').remove();
            opts.inprogress = false;

            // if jsonData, build the imageArray from data provided in JSON format
            if (opts.jsonData && opts.jsonData.length > 0) {
                var parser = opts.jsonDataParser ? opts.jsonDataParser : $.fn.lightbox.parseJsonData;
                opts.imageArray = [];
                opts.imageArray = parser(opts.jsonData);
            }

            var outerImage = '<div id="outerImageContainer"><div id="imageContainer"><iframe id="lightboxIframe"></iframe><img id="lightboxImage" /><div id="hoverNav"><a href="javascript://" title="' + opts.strings.prevLinkTitle + '" id="prevLink"></a><a href="javascript://" id="nextLink" title="' + opts.strings.nextLinkTitle + '"></a></div><div id="loading"><a href="javascript://" id="loadingLink"><img src="' + opts.fileLoadingImage + '"></a></div></div></div>';
            var imageData = '<div id="imageDataContainer" class="clearfix"><div id="imageData"><div id="imageDetails"><span id="caption"></span><span id="numberDisplay"></span></div><div id="bottomNav">';

            if (opts.displayHelp) {
                imageData += '<span id="helpDisplay">' + opts.strings.help + '</span>';
            }

            imageData += '<a href="javascript://" id="bottomNavClose" title="' + opts.strings.closeTitle + '"><img src="' + opts.fileBottomNavCloseImage + '"></a></div></div></div>';

            var string;

            if (opts.navbarOnTop) {
                string = '<div id="overlay"></div><div id="lightbox">' + imageData + outerImage + '</div>';
                $("body").append(string);
                $("#imageDataContainer").addClass('ontop');
            } else {
                string = '<div id="overlay"></div><div id="lightbox">' + outerImage + imageData + '</div>';
                $("body").append(string);
            }

            if (opts.imageScroll === true) {
                $('#lightbox').css('position', 'fixed')
            }

            $("#overlay, #lightbox").click(function () { lightbox.end(); }).hide();
            $("#loadingLink, #bottomNavClose").click(function () { lightbox.end(); return false; });
            $('#outerImageContainer').width(opts.widthCurrent).height(opts.heightCurrent);
            $('#imageDataContainer').width(opts.widthCurrent);

            if (!opts.imageClickClose) {
                $("#lightboxImage").click(function () { return false; });
                $("#hoverNav").click(function () { return false; });
            }
        },
        /*
        # Deploy the sexy overlay and display the lightbox
        #
        # imageObject - the jQuery object passed via the click event in the constructor
        #
        # Examples
        #
        #	showLightbox($('#CheesusCrust'))
        #
        # Returns a boolean true, because it's got nothing else to return. It should give visual feedback when run
        */
        showLightbox: function (imageObject) {
            var opts = this.opts;
            /**
            * select, embed and object tags render over the lightbox in some browsers
            * Right now, the best way to fix it is to hide them, but that can trigger reloading of some flash content
            * I don't have a better fix for this right now, but I want ot leave this comment here so you and I both 
            * know that i'm aware of it, and I would love to fix it, if you have any suggestions.
            **/
            $("select, embed, object").hide();

            // Resize and display the sexy, sexy overlay.
            this.resizeOverlayToFitWindow();
            $("#overlay").hide().css({ opacity: opts.overlayOpacity }).fadeIn();
            imageNum = 0;

            // if data is not provided by jsonData parameter
            if (!opts.jsonData) {
                opts.imageArray = [];
                // if image is NOT part of a set..
                if ((!imageObject.rel || (imageObject.rel == '')) && !opts.allSet) {
                    // add single image to Lightbox.imageArray
                    opts.imageArray.push([imageObject.href, opts.displayTitle ? imageObject.title : '']);
                } else {
                    // if image is part of a set..
                    $("a").each(function () {
                        if (this.href && (this.rel == imageObject.rel)) {
                            opts.imageArray.push([this.href, opts.displayTitle ? this.title : '']);
                        }
                    });
                }
            }

            if (opts.imageArray.length > 1) {
                for (i = 0; i < opts.imageArray.length; i++) {
                    for (j = opts.imageArray.length - 1; j > i; j--) {
                        if (opts.imageArray[i][0] == opts.imageArray[j][0]) {
                            opts.imageArray.splice(j, 1);
                        }
                    }
                }

                while (opts.imageArray[imageNum][0] != imageObject.href) {
                    imageNum++;
                }
            }

            // calculate top and left offset for the lightbox
            var pageScroll = getPageScroll();
            var lightboxTop = pageScroll.top + ($(window).height() / 10);
            var lightboxLeft = pageScroll.left;
            $('#lightbox').css({ top: lightboxTop + 'px', left: lightboxLeft + 'px' }).show();

            if (!opts.slideNavBar) {
                $('#imageData').hide();
            }

            this.changeImage(imageNum);
        },
        changeImage: function (imageNum) {
            var opts = this.opts;
            if (opts.inprogress == false) {
                opts.inprogress = true;

                // update global var
                opts.activeImage = imageNum;

                // hide elements during transition
                $('#loading').show();
                $('#lightboxImage, #hoverNav, #prevLink, #nextLink').hide();

                // delay preloading image until navbar will slide up
                if (opts.slideNavBar) {
                    $('#imageDataContainer').hide();
                    $('#imageData').hide();
                }
                this.doChangeImage();
            }
        },
        doChangeImage: function () {
            var imgPreloader = new Image();
            var opts = this.opts;

            // once image is preloaded, resize image container
            imgPreloader.onload = (function () {
                var opts = this.opts;

                var newWidth = imgPreloader.width;
                var newHeight = imgPreloader.height;

                if (opts.scaleImages) {
                    newWidth = parseInt(opts.xScale * newWidth, 10);
                    newHeight = parseInt(opts.yScale * newHeight, 10);
                }

                if (opts.fitToScreen) {
                    var pageSize = getPageSize();
                    var ratio;
                    var initialPageWidth = pageSize.winWidth - 2 * opts.borderSize;
                    var initialPageHeight = pageSize.winHeight - 200;

                    var dI = initialPageWidth / initialPageHeight;
                    var dP = imgPreloader.width / imgPreloader.height;

                    if ((imgPreloader.height > initialPageHeight) || (imgPreloader.width > initialPageWidth)) {
                        if (dI > dP) {
                            newWidth = parseInt((initialPageHeight / imgPreloader.height) * imgPreloader.width);
                            newHeight = initialPageHeight;
                        } else {
                            newHeight = parseInt((initialPageWidth / imgPreloader.width) * imgPreloader.height);
                            newWidth = initialPageWidth;
                        }
                    }
                }

                $('#lightboxImage').
					attr('src', opts.imageArray[opts.activeImage][0]).
					width(newWidth).
					height(newHeight);

                this.resizeImageContainer(newWidth, newHeight);
            }).bind(this);

            imgPreloader.src = opts.imageArray[opts.activeImage][0];
        },
        end: function () {
            this.disableKeyboardNav();
            $('#lightbox').hide();
            $('#overlay').fadeOut();
            $('select, object, embed').show();
        },
        preloadNeighborImages: function () {
            var opts = this.opts;

            var preloadPrevImage = new Image();
            var preloadNextImage = new Image();

            if (opts.loopImages && opts.imageArray.length > 1) {
                preloadNextImage.src = opts.imageArray[(opts.activeImage == (opts.imageArray.length - 1)) ? 0 : opts.activeImage + 1][0];

                preloadPrevImage.src = opts.imageArray[(opts.activeImage == 0) ? (opts.imageArray.length - 1) : opts.activeImage - 1][0];
            } else {
                if ((opts.imageArray.length - 1) > opts.activeImage) {
                    preloadNextImage.src = opts.imageArray[opts.activeImage + 1][0];
                }
                if (opts.activeImage > 0) {
                    preloadPrevImage.src = opts.imageArray[opts.activeImage - 1][0];
                }
            }
        },
        resizeImageContainer: function (imgWidth, imgHeight) {
            var opts = this.opts;
            var $img = $("#outerImageContainer");

            // get current width and height
            opts.widthCurrent = $img.outerWidth();
            opts.heightCurrent = $img.outerHeight();

            // get new width and height
            var widthNew = Math.max(350, imgWidth + (opts.borderSize * 2));
            var heightNew = (imgHeight + (opts.borderSize * 2));

            // calculate size difference between new and old image, and resize if necessary
            wDiff = opts.widthCurrent - widthNew;
            hDiff = opts.heightCurrent - heightNew;

            $('#imageDataContainer').animate({ width: widthNew }, opts.resizeSpeed, 'linear');
            $img.animate({ width: widthNew }, opts.resizeSpeed, 'linear', function () {
                $img.animate({ height: heightNew }, opts.resizeSpeed, 'linear', function () {
                    lightbox.showImage();
                });
            });

            afterTimeout = function () {
                $('#prevLink').height(imgHeight);
                $('#nextLink').height(imgHeight);
            };

            // if new and old image are same size and no scaling transition is necessary,
            // do a quick pause to prevent image flicker.
            if ((hDiff == 0) && (wDiff == 0)) {
                setTimeout(afterTimeout, 100);
            } else {
                // otherwise just trigger the height and width change
                afterTimeout();
            }
        },
        showImage: function () {
            $('#loading').hide();
            $('#lightboxImage').fadeIn("fast");
            this.updateDetails();
            this.preloadNeighborImages();

            this.opts.inprogress = false;
        },
        updateDetails: function () {
            var opts = this.opts;

            var $numberDisplay = $('#numberDisplay');

            $numberDisplay.html('');

            if (opts.imageArray[opts.activeImage][1]) {
                $('#caption').html(opts.imageArray[opts.activeImage][1]).show();
            }

            // if image is part of set display 'Image x of x'
            if (opts.imageArray.length > 1) {
                var nav_html;

                nav_html = opts.strings.image + (opts.activeImage + 1) + opts.strings.of + opts.imageArray.length;

                if (opts.displayDownloadLink) {
                    nav_html += "<a href='" + opts.imageArray[opts.activeImage][0] + "'>" + opts.strings.download + "</a>";
                }

                if (!opts.disableNavbarLinks) {
                    // display previous / next text links
                    if ((opts.activeImage) > 0 || opts.loopImages) {
                        nav_html = '<a title="' + opts.strings.prevLinkTitle + '" href="#" id="prevLinkText">' + opts.strings.prevLinkText + "</a>" + nav_html;
                    }

                    if (((opts.activeImage + 1) < opts.imageArray.length) || opts.loopImages) {
                        nav_html += '<a title="' + opts.strings.nextLinkTitle + '" href="#" id="nextLinkText">' + opts.strings.nextLinkText + "</a>";
                    }
                }

                $numberDisplay.html(nav_html).show();
            }

            if (opts.slideNavBar) {
                $("#imageData").slideDown(opts.navBarSlideSpeed);
            } else {
                $("#imageData").show();
            }

            this.resizeOverlayToFitWindow();
            this.updateNav();
        },
        /*
        # Resize the sexy overlay to fit the constraints of your current viewing environment
        # 
        # This should now happen whenever a window is resized, so you should always see a full overlay
        */
        resizeOverlayToFitWindow: function () {
            var $doc = $(document);

            $('#overlay').css({ width: $doc.width(), height: $doc.height() });
            //  ^^^^^^^ <- sexy!
        },
        updateNav: function () {
            var opts = this.opts;

            if (opts.imageArray.length > 1) {
                $('#hoverNav').show();

                // if loopImages is true, always show next and prev image buttons 
                if (opts.loopImages) {
                    $('#prevLink,#prevLinkText').show().click(function () {
                        lightbox.changeImage((opts.activeImage == 0) ? (opts.imageArray.length - 1) : opts.activeImage - 1);
                        return false;
                    });

                    $('#nextLink,#nextLinkText').show().click(function () {
                        lightbox.changeImage((opts.activeImage == (opts.imageArray.length - 1)) ? 0 : opts.activeImage + 1);
                        return false;
                    });

                } else {
                    // if not first image in set, display prev image button
                    if (opts.activeImage != 0) {
                        $('#prevLink,#prevLinkText').show().click(function () {
                            lightbox.changeImage(opts.activeImage - 1);
                            return false;
                        });
                    }

                    // if not last image in set, display next image button
                    if (opts.activeImage != (opts.imageArray.length - 1)) {
                        $('#nextLink,#nextLinkText').show().click(function () {
                            lightbox.changeImage(opts.activeImage + 1);
                            return false;
                        });
                    }
                }

            }
            this.enableKeyboardNav();
        },
        enableKeyboardNav: function () {
            $(document).bind('keydown', { opts: this.opts }, keyboardAction);
        },

        disableKeyboardNav: function () {
            $(document).unbind('keydown');
        }
    };

    /*
    # Get the document and window width/height
    #
    # Examples
    #
    #	getPageSize()
    #
    # Returns a numerically indexed array of document width/height and window width/height
    */
    function getPageSize() {
        var $doc = $(document);
        var $win = $(window);

        return {
            docWidth: $doc.width(),
            docHeight: $doc.height(),
            winWidth: $win.width(),
            winHeight: $win.height()
        };
    }

    function getPageScroll() {
        var $doc = $(document);

        return {
            left: $doc.scrollLeft(),
            top: $doc.scrollTop()
        };
    }

    function keyboardAction(e) {
        var o = e.data.opts;
        var keycode = e.keyCode;
        var escapeKey = 27;

        var key = String.fromCharCode(keycode).toLowerCase();

        // close lightbox
        if ((key == 'x') || (key == 'o') || (key == 'c') || (keycode == escapeKey)) {
            lightbox.end();
            return;

            // display previous image
            lightbox.disableKeyboardNav();

            if ((key == 'p') || (keycode == 37)) {
                if (o.loopImages) {

                    lightbox.changeImage((o.activeImage == 0) ? (o.imageArray.length - 1) : o.activeImage - 1);
                } else if (o.activeImage != 0) {
                    lightbox.changeImage(o.activeImage - 1);
                }

                // display next image
            } else if ((key == 'n') || (keycode == 39)) {
                if (opts.loopImages) {
                    lightbox.changeImage((o.activeImage == (o.imageArray.length - 1)) ? 0 : o.activeImage + 1);
                } else if (o.activeImage != (o.imageArray.length - 1)) {
                    lightbox.changeImage(o.activeImage + 1);
                }
            }
        }
    }


    $.fn.lightbox = function (options) {
        // build main options
        var opts = $.extend({}, $.fn.lightbox.defaults, options);

        $(window).resize(lightbox.resizeOverlayToFitWindow);

        return $(this).on(opts.triggerEvent, function () {
            // initialize the lightbox
            lightbox.initialize(opts);
            lightbox.showLightbox(this);
            return false;
        });
    };

    $.fn.lightbox.parseJsonData = function (data) {
        var imageArray = [];

        $.each(data, function () {
            imageArray.push(new Array(this.url, this.title));
        });

        return imageArray;
    };

    $.fn.lightbox.defaults = {
        triggerEvent: "click",
        allSet: false,
        fileLoadingImage: 'images/loading.gif',
        fileBottomNavCloseImage: 'images/closelabel.gif',
        overlayOpacity: 0.6,
        borderSize: 10,
        imageArray: new Array,
        activeImage: null,
        imageScroll: false,
        inprogress: false,
        resizeSpeed: 350,
        widthCurrent: 250,
        heightCurrent: 250,
        scaleImages: false,
        xScale: 1,
        yScale: 1,
        displayTitle: true,
        navbarOnTop: false,
        displayDownloadLink: false,
        slideNavBar: false,
        navBarSlideSpeed: 350,
        displayHelp: false,
        strings: {
            help: ' \u2190 / P - previous image\u00a0\u00a0\u00a0\u00a0\u2192 / N - next image\u00a0\u00a0\u00a0\u00a0ESC / X - close image gallery',
            prevLinkTitle: 'previous image',
            nextLinkTitle: 'next image',
            prevLinkText: '&laquo; Previous',
            nextLinkText: 'Next &raquo;',
            closeTitle: 'close image gallery',
            image: 'Image ',
            of: ' of ',
            download: 'Download'
        },
        fitToScreen: false,
        disableNavbarLinks: false,
        loopImages: false,
        imageClickClose: true,
        jsonData: null,
        jsonDataParser: null
    };
})(jQuery);
