(function(e){var t="//lab.lepture.com/github-cards/";var r,i=0;var a=e.getElementsByTagName("meta");var n,l,c,d;for(r=0;r<a.length;r++){var u=a[r].getAttribute("name");var f=a[r].getAttribute("content");if(u==="gc:url"){n=f}else if(u==="gc:base"){t=f}else if(u==="gc:client-id"){l=f}else if(u==="gc:client-secret"){c=f}else if(u==="gc:theme"){d=f}}function s(t){if(e.querySelectorAll){return e.querySelectorAll("."+t)}var i=e.getElementsByTagName("div");var a=[];for(r=0;r<i.length;r++){if(~i[r].className.split(" ").indexOf(t)){a.push(i[r])}}return a}function g(e,t){return e.getAttribute("data-"+t)}function h(e){if(window.addEventListener){window.addEventListener("message",function(t){if(e.id===t.data.sender){e.height=t.data.height}},false)}}function o(r,a){a=a||n;if(!a){var u=g(r,"theme")||d||"default";a=t+"cards/"+u+".html"}var f=g(r,"user");var s=g(r,"repo");var o=g(r,"github");if(o){o=o.split("/");if(o.length&&!f){f=o[0];s=s||o[1]}}if(!f){return}i+=1;var v=g(r,"width");var m=g(r,"height");var b=g(r,"target");var w=g(r,"client-id")||l;var p=g(r,"client-secret")||c;var A="ghcard-"+f+"-"+i;var y=e.createElement("iframe");y.setAttribute("id",A);y.setAttribute("frameborder",0);y.setAttribute("scrolling",0);y.setAttribute("allowtransparency",true);var E=a+"?user="+f+"&identity="+A;if(s){E+="&repo="+s}if(b){E+="&target="+b}if(w&&p){E+="&client_id="+w+"&client_secret="+p}y.src=E;y.width=v||Math.min(r.parentNode.clientWidth||400,400);if(m){y.height=m}h(y);r.parentNode.replaceChild(y,r);return y}var v=s("github-card");for(r=0;r<v.length;r++){o(v[r])}if(window.githubCard){window.githubCard.render=o}})(document);
/**
 * Insight search plugin
 * @author PPOffice { @link https://github.com/ppoffice }
 */
(function ($, CONFIG) {
    var $main = $('.ins-search');
    var $input = $main.find('.ins-search-input');
    var $wrapper = $main.find('.ins-section-wrapper');
    var $container = $main.find('.ins-section-container');
    $main.parent().remove('.ins-search');
    $('body').append($main);

    function section (title) {
        return $('<section>').addClass('ins-section')
            .append($('<header>').addClass('ins-section-header').text(title));
    }

    function searchItem (icon, title, slug, preview, url) {
        return $('<div>').addClass('ins-selectable').addClass('ins-search-item')
            .append($('<header>').append($('<i>').addClass('fa').addClass('fa-' + icon)).append(title != null && title != '' ? title : CONFIG.TRANSLATION['UNTITLED'])
                .append(slug ? $('<span>').addClass('ins-slug').text(slug) : null))
            .append(preview ? $('<p>').addClass('ins-search-preview').text(preview) : null)
            .attr('data-url', url);
    }

    function sectionFactory (type, array) {
        var sectionTitle;
        var $searchItems;
        if (array.length === 0) return null;
        sectionTitle = CONFIG.TRANSLATION[type];
        switch (type) {
            case 'POSTS':
            case 'PAGES':
                $searchItems = array.map(function (item) {
                    // Use config.root instead of permalink to fix url issue
                    return searchItem('file', item.title, null, item.text.slice(0, 150), CONFIG.ROOT_URL + item.path);
                });
                break;
            case 'CATEGORIES':
            case 'TAGS':
                $searchItems = array.map(function (item) {
                    return searchItem(type === 'CATEGORIES' ? 'folder' : 'tag', item.name, item.slug, null, item.permalink);
                });
                break;
            default:
                return null;
        }
        return section(sectionTitle).append($searchItems);
    }

    function extractToSet (json, key) {
        var values = {};
        var entries = json.pages.concat(json.posts);
        entries.forEach(function (entry) {
            if (entry[key]) {
                entry[key].forEach(function (value) {
                    values[value.name] = value;
                });
            }
        });
        var result = [];
        for (var key in values) {
            result.push(values[key]);
        }
        return result;
    }

    function parseKeywords (keywords) {
        return keywords.split(' ').filter(function (keyword) {
            return !!keyword;
        }).map(function (keyword) {
            return keyword.toUpperCase();
        });
    }

    /**
     * Judge if a given post/page/category/tag contains all of the keywords.
     * @param Object            obj     Object to be weighted
     * @param Array<String>     fields  Object's fields to find matches
     */
    function filter (keywords, obj, fields) {
        var result = false;
        var keywordArray = parseKeywords(keywords);
        var containKeywords = keywordArray.filter(function (keyword) {
            var containFields = fields.filter(function (field) {
                if (!obj.hasOwnProperty(field))
                    return false;
                if (obj[field].toUpperCase().indexOf(keyword) > -1)
                    return true;
            });
            if (containFields.length > 0)
                return true;
            return false;
        });
        return containKeywords.length === keywordArray.length;
    }

    function filterFactory (keywords) {
        return {
            POST: function (obj) {
                return filter(keywords, obj, ['title', 'text']);
            },
            PAGE: function (obj) {
                return filter(keywords, obj, ['title', 'text']);
            },
            CATEGORY: function (obj) {
                return filter(keywords, obj, ['name', 'slug']);
            },
            TAG: function (obj) {
                return filter(keywords, obj, ['name', 'slug']);
            }
        };
    }

    /**
     * Calculate the weight of a matched post/page/category/tag.
     * @param Object            obj     Object to be weighted
     * @param Array<String>     fields  Object's fields to find matches
     * @param Array<Integer>    weights Weight of every field
     */
    function weight (keywords, obj, fields, weights) {
        var value = 0;
        parseKeywords(keywords).forEach(function (keyword) {
            var pattern = new RegExp(keyword, 'img'); // Global, Multi-line, Case-insensitive
            fields.forEach(function (field, index) {
                if (obj.hasOwnProperty(field)) {
                    var matches = obj[field].match(pattern);
                    value += matches ? matches.length * weights[index] : 0;
                }
            });
        });
        return value;
    }

    function weightFactory (keywords) {
        return {
            POST: function (obj) {
                return weight(keywords, obj, ['title', 'text'], [3, 1]);
            },
            PAGE: function (obj) {
                return weight(keywords, obj, ['title', 'text'], [3, 1]);
            },
            CATEGORY: function (obj) {
                return weight(keywords, obj, ['name', 'slug'], [1, 1]);
            },
            TAG: function (obj) {
                return weight(keywords, obj, ['name', 'slug'], [1, 1]);
            }
        };
    }

    function search (json, keywords) {
        var WEIGHTS = weightFactory(keywords);
        var FILTERS = filterFactory(keywords);
        var posts = json.posts;
        var pages = json.pages;
        var tags = extractToSet(json, 'tags');
        var categories = extractToSet(json, 'categories');
        return {
            posts: posts.filter(FILTERS.POST).sort(function (a, b) { return WEIGHTS.POST(b) - WEIGHTS.POST(a); }).slice(0, 5),
            pages: pages.filter(FILTERS.PAGE).sort(function (a, b) { return WEIGHTS.PAGE(b) - WEIGHTS.PAGE(a); }).slice(0, 5),
            categories: categories.filter(FILTERS.CATEGORY).sort(function (a, b) { return WEIGHTS.CATEGORY(b) - WEIGHTS.CATEGORY(a); }).slice(0, 5),
            tags: tags.filter(FILTERS.TAG).sort(function (a, b) { return WEIGHTS.TAG(b) - WEIGHTS.TAG(a); }).slice(0, 5)
        };
    }

    function searchResultToDOM (searchResult) {
        $container.empty();
        for (var key in searchResult) {
            $container.append(sectionFactory(key.toUpperCase(), searchResult[key]));
        }
    }

    function scrollTo ($item) {
        if ($item.length === 0) return;
        var wrapperHeight = $wrapper[0].clientHeight;
        var itemTop = $item.position().top - $wrapper.scrollTop();
        var itemBottom = $item[0].clientHeight + $item.position().top;
        if (itemBottom > wrapperHeight + $wrapper.scrollTop()) {
            $wrapper.scrollTop(itemBottom - $wrapper[0].clientHeight);
        }
        if (itemTop < 0) {
            $wrapper.scrollTop($item.position().top);
        }
    }

    function selectItemByDiff (value) {
        var $items = $.makeArray($container.find('.ins-selectable'));
        var prevPosition = -1;
        $items.forEach(function (item, index) {
            if ($(item).hasClass('active')) {
                prevPosition = index;
                return;
            }
        });
        var nextPosition = ($items.length + prevPosition + value) % $items.length;
        $($items[prevPosition]).removeClass('active');
        $($items[nextPosition]).addClass('active');
        scrollTo($($items[nextPosition]));
    }

    function gotoLink ($item) {
        if ($item && $item.length) {
            location.href = $item.attr('data-url');
        }
    }

    $.getJSON(CONFIG.CONTENT_URL, function (json) {
        if (location.hash.trim() === '#ins-search') {
            $main.addClass('show');
        }
        $input.on('input', function () {
            var keywords = $(this).val();
            searchResultToDOM(search(json, keywords));
        });
        $input.trigger('input');
    });


    $(document).on('click focus', '.search-form-input', function () {
        $main.addClass('show');
        $main.find('.ins-search-input').focus();
    }).on('click', '.ins-search-item', function () {
        gotoLink($(this));
    }).on('click', '.ins-close', function () {
        $main.removeClass('show');
    }).on('keydown', function (e) {
        if (!$main.hasClass('show')) return;
        switch (e.keyCode) {
            case 27: // ESC
                $main.removeClass('show'); break;
            case 38: // UP
                selectItemByDiff(-1); break;
            case 40: // DOWN
                selectItemByDiff(1); break;
            case 13: //ENTER
                gotoLink($container.find('.ins-selectable.active').eq(0)); break;
        }
    });
})(jQuery, window.INSIGHT_CONFIG);/**!
 * lightgallery.js | 0.0.2 | August 4th 2016
 * http://sachinchoolur.github.io/lightGallery/
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t.Lightgallery=e()}}(function(){var e,t,s;return function e(t,s,l){function i(d,r){if(!s[d]){if(!t[d]){var n="function"==typeof require&&require;if(!r&&n)return n(d,!0);if(o)return o(d,!0);var a=new Error("Cannot find module '"+d+"'");throw a.code="MODULE_NOT_FOUND",a}var u=s[d]={exports:{}};t[d][0].call(u.exports,function(e){var s=t[d][1][e];return i(s?s:e)},u,u.exports,e,t,s,l)}return s[d].exports}for(var o="function"==typeof require&&require,d=0;d<l.length;d++)i(l[d]);return i}({1:[function(t,s,l){!function(t,s){if("function"==typeof e&&e.amd)e(["exports"],s);else if("undefined"!=typeof l)s(l);else{var i={exports:{}};s(i.exports),t.lgUtils=i.exports}}(this,function(e){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),window.getAttribute=function(e){return window[e]},window.setAttribute=function(e,t){window[e]=t},document.getAttribute=function(e){return document[e]},document.setAttribute=function(e,t){document[e]=t};var t={wrap:function e(t,s){if(t){var l=document.createElement("div");l.className=s,t.parentNode.insertBefore(l,t),t.parentNode.removeChild(t),l.appendChild(t)}},addClass:function e(t,s){t&&(t.classList?t.classList.add(s):t.className+=" "+s)},removeClass:function e(t,s){t&&(t.classList?t.classList.remove(s):t.className=t.className.replace(new RegExp("(^|\\b)"+s.split(" ").join("|")+"(\\b|$)","gi")," "))},hasClass:function e(t,s){return t.classList?t.classList.contains(s):new RegExp("(^| )"+s+"( |$)","gi").test(t.className)},setVendor:function e(t,s,l){t&&(t.style[s.charAt(0).toLowerCase()+s.slice(1)]=l,t.style["webkit"+s]=l,t.style["moz"+s]=l,t.style["ms"+s]=l,t.style["o"+s]=l)},trigger:function e(t,s){var l=arguments.length<=2||void 0===arguments[2]?null:arguments[2];if(t){var i=new CustomEvent(s,{detail:l});t.dispatchEvent(i)}},Listener:{uid:0},on:function e(s,l,i){s&&l.split(" ").forEach(function(e){var l=s.getAttribute("lg-event-uid")||"";t.Listener.uid++,l+="&"+t.Listener.uid,s.setAttribute("lg-event-uid",l),t.Listener[e+t.Listener.uid]=i,s.addEventListener(e.split(".")[0],i,!1)})},off:function e(s,l){if(s){var i=s.getAttribute("lg-event-uid");if(i){i=i.split("&");for(var o=0;o<i.length;o++)if(i[o]){var d=l+i[o];if("."===d.substring(0,1))for(var r in t.Listener)t.Listener.hasOwnProperty(r)&&r.split(".").indexOf(d.split(".")[1])>-1&&(s.removeEventListener(r.split(".")[0],t.Listener[r]),s.setAttribute("lg-event-uid",s.getAttribute("lg-event-uid").replace("&"+i[o],"")),delete t.Listener[r]);else s.removeEventListener(d.split(".")[0],t.Listener[d]),s.setAttribute("lg-event-uid",s.getAttribute("lg-event-uid").replace("&"+i[o],"")),delete t.Listener[d]}}}},param:function e(t){return Object.keys(t).map(function(e){return encodeURIComponent(e)+"="+encodeURIComponent(t[e])}).join("&")}};e.default=t})},{}],2:[function(t,s,l){!function(s,i){if("function"==typeof e&&e.amd)e(["./lg-utils"],i);else if("undefined"!=typeof l)i(t("./lg-utils"));else{var o={exports:{}};i(s.lgUtils),s.lightgallery=o.exports}}(this,function(e){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}function s(e,t){if(this.el=e,this.s=i({},o,t),this.s.dynamic&&"undefined"!==this.s.dynamicEl&&this.s.dynamicEl.constructor===Array&&!this.s.dynamicEl.length)throw"When using dynamic mode, you must also define dynamicEl as an Array.";return this.modules={},this.lGalleryOn=!1,this.lgBusy=!1,this.hideBartimeout=!1,this.isTouch="ontouchstart"in document.documentElement,this.s.slideEndAnimatoin&&(this.s.hideControlOnEnd=!1),this.items=[],this.s.dynamic?this.items=this.s.dynamicEl:"this"===this.s.selector?this.items.push(this.el):""!==this.s.selector?this.s.selectWithin?this.items=document.querySelector(this.s.selectWithin).querySelectorAll(this.s.selector):this.items=this.el.querySelectorAll(this.s.selector):this.items=this.el.children,this.___slide="",this.outer="",this.init(),this}var l=t(e),i=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var s=arguments[t];for(var l in s)Object.prototype.hasOwnProperty.call(s,l)&&(e[l]=s[l])}return e};!function(){function e(e,t){t=t||{bubbles:!1,cancelable:!1,detail:void 0};var s=document.createEvent("CustomEvent");return s.initCustomEvent(e,t.bubbles,t.cancelable,t.detail),s}return"function"!=typeof window.CustomEvent&&(e.prototype=window.Event.prototype,void(window.CustomEvent=e))}(),window.utils=l.default,window.lgData={uid:0},window.lgModules={};var o={mode:"lg-slide",cssEasing:"ease",easing:"linear",speed:600,height:"100%",width:"100%",addClass:"",startClass:"lg-start-zoom",backdropDuration:150,hideBarsDelay:6e3,useLeft:!1,closable:!0,loop:!0,escKey:!0,keyPress:!0,controls:!0,slideEndAnimatoin:!0,hideControlOnEnd:!1,mousewheel:!1,getCaptionFromTitleOrAlt:!0,appendSubHtmlTo:".lg-sub-html",subHtmlSelectorRelative:!1,preload:1,showAfterLoad:!0,selector:"",selectWithin:"",nextHtml:"",prevHtml:"",index:!1,iframeMaxWidth:"100%",download:!0,counter:!0,appendCounterTo:".lg-toolbar",swipeThreshold:50,enableSwipe:!0,enableDrag:!0,dynamic:!1,dynamicEl:[],galleryId:1};s.prototype.init=function(){var e=this;e.s.preload>e.items.length&&(e.s.preload=e.items.length);var t=window.location.hash;if(t.indexOf("lg="+this.s.galleryId)>0&&(e.index=parseInt(t.split("&slide=")[1],10),l.default.addClass(document.body,"lg-from-hash"),l.default.hasClass(document.body,"lg-on")||(l.default.addClass(document.body,"lg-on"),setTimeout(function(){e.build(e.index)}))),e.s.dynamic)l.default.trigger(this.el,"onBeforeOpen"),e.index=e.s.index||0,l.default.hasClass(document.body,"lg-on")||(l.default.addClass(document.body,"lg-on"),setTimeout(function(){e.build(e.index)}));else for(var s=0;s<e.items.length;s++)!function(t){l.default.on(e.items[t],"click.lgcustom",function(s){s.preventDefault(),l.default.trigger(e.el,"onBeforeOpen"),e.index=e.s.index||t,l.default.hasClass(document.body,"lg-on")||(e.build(e.index),l.default.addClass(document.body,"lg-on"))})}(s)},s.prototype.build=function(e){var t=this;t.structure();for(var s in window.lgModules)t.modules[s]=new window.lgModules[s](t.el);t.slide(e,!1,!1),t.s.keyPress&&t.keyPress(),t.items.length>1&&(t.arrow(),setTimeout(function(){t.enableDrag(),t.enableSwipe()},50),t.s.mousewheel&&t.mousewheel()),t.counter(),t.closeGallery(),l.default.trigger(t.el,"onAfterOpen"),l.default.on(t.outer,"mousemove.lg click.lg touchstart.lg",function(){l.default.removeClass(t.outer,"lg-hide-items"),clearTimeout(t.hideBartimeout),t.hideBartimeout=setTimeout(function(){l.default.addClass(t.outer,"lg-hide-items")},t.s.hideBarsDelay)})},s.prototype.structure=function(){var e="",t="",s=0,i="",o,d=this;for(document.body.insertAdjacentHTML("beforeend",'<div class="lg-backdrop"></div>'),l.default.setVendor(document.querySelector(".lg-backdrop"),"TransitionDuration",this.s.backdropDuration+"ms"),s=0;s<this.items.length;s++)e+='<div class="lg-item"></div>';if(this.s.controls&&this.items.length>1&&(t='<div class="lg-actions"><div class="lg-prev lg-icon">'+this.s.prevHtml+'</div><div class="lg-next lg-icon">'+this.s.nextHtml+"</div></div>"),".lg-sub-html"===this.s.appendSubHtmlTo&&(i='<div class="lg-sub-html"></div>'),o='<div class="lg-outer '+this.s.addClass+" "+this.s.startClass+'"><div class="lg" style="width:'+this.s.width+"; height:"+this.s.height+'"><div class="lg-inner">'+e+'</div><div class="lg-toolbar group"><span class="lg-close lg-icon"></span></div>'+t+i+"</div></div>",document.body.insertAdjacentHTML("beforeend",o),this.outer=document.querySelector(".lg-outer"),this.___slide=this.outer.querySelectorAll(".lg-item"),this.s.useLeft?(l.default.addClass(this.outer,"lg-use-left"),this.s.mode="lg-slide"):l.default.addClass(this.outer,"lg-use-css3"),d.setTop(),l.default.on(window,"resize.lg orientationchange.lg",function(){setTimeout(function(){d.setTop()},100)}),l.default.addClass(this.___slide[this.index],"lg-current"),this.doCss()?l.default.addClass(this.outer,"lg-css3"):(l.default.addClass(this.outer,"lg-css"),this.s.speed=0),l.default.addClass(this.outer,this.s.mode),this.s.enableDrag&&this.items.length>1&&l.default.addClass(this.outer,"lg-grab"),this.s.showAfterLoad&&l.default.addClass(this.outer,"lg-show-after-load"),this.doCss()){var r=this.outer.querySelector(".lg-inner");l.default.setVendor(r,"TransitionTimingFunction",this.s.cssEasing),l.default.setVendor(r,"TransitionDuration",this.s.speed+"ms")}l.default.addClass(document.querySelector(".lg-backdrop"),"in"),setTimeout(function(){l.default.addClass(d.outer,"lg-visible")},this.s.backdropDuration),this.s.download&&this.outer.querySelector(".lg-toolbar").insertAdjacentHTML("beforeend",'<a id="lg-download" target="_blank" download class="lg-download lg-icon"></a>'),this.prevScrollTop=document.documentElement.scrollTop||document.body.scrollTop},s.prototype.setTop=function(){if("100%"!==this.s.height){var e=window.innerHeight,t=(e-parseInt(this.s.height,10))/2,s=this.outer.querySelector(".lg");e>=parseInt(this.s.height,10)?s.style.top=t+"px":s.style.top="0px"}},s.prototype.doCss=function(){var e=function e(){var t=["transition","MozTransition","WebkitTransition","OTransition","msTransition","KhtmlTransition"],s=document.documentElement,l=0;for(l=0;l<t.length;l++)if(t[l]in s.style)return!0};return!!e()},s.prototype.isVideo=function(e,t){var s;if(s=this.s.dynamic?this.s.dynamicEl[t].html:this.items[t].getAttribute("data-html"),!e&&s)return{html5:!0};var l=e.match(/\/\/(?:www\.)?youtu(?:\.be|be\.com)\/(?:watch\?v=|embed\/)?([a-z0-9\-\_\%]+)/i),i=e.match(/\/\/(?:www\.)?vimeo.com\/([0-9a-z\-_]+)/i),o=e.match(/\/\/(?:www\.)?dai.ly\/([0-9a-z\-_]+)/i),d=e.match(/\/\/(?:www\.)?(?:vk\.com|vkontakte\.ru)\/(?:video_ext\.php\?)(.*)/i);return l?{youtube:l}:i?{vimeo:i}:o?{dailymotion:o}:d?{vk:d}:void 0},s.prototype.counter=function(){this.s.counter&&this.outer.querySelector(this.s.appendCounterTo).insertAdjacentHTML("beforeend",'<div id="lg-counter"><span id="lg-counter-current">'+(parseInt(this.index,10)+1)+'</span> / <span id="lg-counter-all">'+this.items.length+"</span></div>")},s.prototype.addHtml=function(e){var t=null,s;if(this.s.dynamic?t=this.s.dynamicEl[e].subHtml:(s=this.items[e],t=s.getAttribute("data-sub-html"),this.s.getCaptionFromTitleOrAlt&&!t&&(t=s.getAttribute("title"),t&&s.querySelector("img")&&(t=s.querySelector("img").getAttribute("alt")))),"undefined"!=typeof t&&null!==t){var i=t.substring(0,1);"."!==i&&"#"!==i||(t=this.s.subHtmlSelectorRelative&&!this.s.dynamic?s.querySelector(t).innerHTML:document.querySelector(t).innerHTML)}else t="";".lg-sub-html"===this.s.appendSubHtmlTo?this.outer.querySelector(this.s.appendSubHtmlTo).innerHTML=t:this.___slide[e].insertAdjacentHTML("beforeend",t),"undefined"!=typeof t&&null!==t&&(""===t?l.default.addClass(this.outer.querySelector(this.s.appendSubHtmlTo),"lg-empty-html"):l.default.removeClass(this.outer.querySelector(this.s.appendSubHtmlTo),"lg-empty-html")),l.default.trigger(this.el,"onAfterAppendSubHtml",{index:e})},s.prototype.preload=function(e){var t=1,s=1;for(t=1;t<=this.s.preload&&!(t>=this.items.length-e);t++)this.loadContent(e+t,!1,0);for(s=1;s<=this.s.preload&&!(e-s<0);s++)this.loadContent(e-s,!1,0)},s.prototype.loadContent=function(e,t,s){var i=this,o=!1,d,r,n,a,u,c,g=function e(t){for(var s=[],l=[],i=0;i<t.length;i++){var o=t[i].split(" ");""===o[0]&&o.splice(0,1),l.push(o[0]),s.push(o[1])}for(var d=window.innerWidth,n=0;n<s.length;n++)if(parseInt(s[n],10)>d){r=l[n];break}};if(i.s.dynamic){if(i.s.dynamicEl[e].poster&&(o=!0,n=i.s.dynamicEl[e].poster),c=i.s.dynamicEl[e].html,r=i.s.dynamicEl[e].src,i.s.dynamicEl[e].responsive){var f=i.s.dynamicEl[e].responsive.split(",");g(f)}a=i.s.dynamicEl[e].srcset,u=i.s.dynamicEl[e].sizes}else{if(i.items[e].getAttribute("data-poster")&&(o=!0,n=i.items[e].getAttribute("data-poster")),c=i.items[e].getAttribute("data-html"),r=i.items[e].getAttribute("href")||i.items[e].getAttribute("data-src"),i.items[e].getAttribute("data-responsive")){var h=i.items[e].getAttribute("data-responsive").split(",");g(h)}a=i.items[e].getAttribute("data-srcset"),u=i.items[e].getAttribute("data-sizes")}var m=!1;i.s.dynamic?i.s.dynamicEl[e].iframe&&(m=!0):"true"===i.items[e].getAttribute("data-iframe")&&(m=!0);var p=i.isVideo(r,e);if(!l.default.hasClass(i.___slide[e],"lg-loaded")){if(m)i.___slide[e].insertAdjacentHTML("afterbegin",'<div class="lg-video-cont" style="max-width:'+i.s.iframeMaxWidth+'"><div class="lg-video"><iframe class="lg-object" frameborder="0" src="'+r+'"  allowfullscreen="true"></iframe></div></div>');else if(o){var v="";v=p&&p.youtube?"lg-has-youtube":p&&p.vimeo?"lg-has-vimeo":"lg-has-html5",i.___slide[e].insertAdjacentHTML("beforeend",'<div class="lg-video-cont '+v+' "><div class="lg-video"><span class="lg-video-play"></span><img class="lg-object lg-has-poster" src="'+n+'" /></div></div>')}else p?(i.___slide[e].insertAdjacentHTML("beforeend",'<div class="lg-video-cont "><div class="lg-video"></div></div>'),l.default.trigger(i.el,"hasVideo",{index:e,src:r,html:c})):i.___slide[e].insertAdjacentHTML("beforeend",'<div class="lg-img-wrap"><img class="lg-object lg-image" src="'+r+'" /></div>');if(l.default.trigger(i.el,"onAferAppendSlide",{index:e}),d=i.___slide[e].querySelector(".lg-object"),u&&d.setAttribute("sizes",u),a){d.setAttribute("srcset",a);try{picturefill({elements:[d[0]]})}catch(e){console.error("Make sure you have included Picturefill version 2")}}".lg-sub-html"!==this.s.appendSubHtmlTo&&i.addHtml(e),l.default.addClass(i.___slide[e],"lg-loaded")}l.default.on(i.___slide[e].querySelector(".lg-object"),"load.lg error.lg",function(){var t=0;s&&!l.default.hasClass(document.body,"lg-from-hash")&&(t=s),setTimeout(function(){l.default.addClass(i.___slide[e],"lg-complete"),l.default.trigger(i.el,"onSlideItemLoad",{index:e,delay:s||0})},t)}),p&&p.html5&&!o&&l.default.addClass(i.___slide[e],"lg-complete"),t===!0&&(l.default.hasClass(i.___slide[e],"lg-complete")?i.preload(e):l.default.on(i.___slide[e].querySelector(".lg-object"),"load.lg error.lg",function(){i.preload(e)}))},s.prototype.slide=function(e,t,s){for(var i=0,o=0;o<this.___slide.length;o++)if(l.default.hasClass(this.___slide[o],"lg-current")){i=o;break}var d=this;if(!d.lGalleryOn||i!==e){var r=this.___slide.length,n=d.lGalleryOn?this.s.speed:0,a=!1,u=!1;if(!d.lgBusy){if(this.s.download){var c;c=d.s.dynamic?d.s.dynamicEl[e].downloadUrl!==!1&&(d.s.dynamicEl[e].downloadUrl||d.s.dynamicEl[e].src):"false"!==d.items[e].getAttribute("data-download-url")&&(d.items[e].getAttribute("data-download-url")||d.items[e].getAttribute("href")||d.items[e].getAttribute("data-src")),c?(document.getElementById("lg-download").setAttribute("href",c),l.default.removeClass(d.outer,"lg-hide-download")):l.default.addClass(d.outer,"lg-hide-download")}if(l.default.trigger(d.el,"onBeforeSlide",{prevIndex:i,index:e,fromTouch:t,fromThumb:s}),d.lgBusy=!0,clearTimeout(d.hideBartimeout),".lg-sub-html"===this.s.appendSubHtmlTo&&setTimeout(function(){d.addHtml(e)},n),this.arrowDisable(e),t){var g=e-1,f=e+1;0===e&&i===r-1?(f=0,g=r-1):e===r-1&&0===i&&(f=0,g=r-1),l.default.removeClass(d.outer.querySelector(".lg-prev-slide"),"lg-prev-slide"),l.default.removeClass(d.outer.querySelector(".lg-current"),"lg-current"),l.default.removeClass(d.outer.querySelector(".lg-next-slide"),"lg-next-slide"),l.default.addClass(d.___slide[g],"lg-prev-slide"),l.default.addClass(d.___slide[f],"lg-next-slide"),l.default.addClass(d.___slide[e],"lg-current")}else{l.default.addClass(d.outer,"lg-no-trans");for(var h=0;h<this.___slide.length;h++)l.default.removeClass(this.___slide[h],"lg-prev-slide"),l.default.removeClass(this.___slide[h],"lg-next-slide");e<i?(u=!0,0!==e||i!==r-1||s||(u=!1,a=!0)):e>i&&(a=!0,e!==r-1||0!==i||s||(u=!0,a=!1)),u?(l.default.addClass(this.___slide[e],"lg-prev-slide"),l.default.addClass(this.___slide[i],"lg-next-slide")):a&&(l.default.addClass(this.___slide[e],"lg-next-slide"),l.default.addClass(this.___slide[i],"lg-prev-slide")),setTimeout(function(){l.default.removeClass(d.outer.querySelector(".lg-current"),"lg-current"),l.default.addClass(d.___slide[e],"lg-current"),l.default.removeClass(d.outer,"lg-no-trans")},50)}d.lGalleryOn?(setTimeout(function(){d.loadContent(e,!0,0)},this.s.speed+50),setTimeout(function(){d.lgBusy=!1,l.default.trigger(d.el,"onAfterSlide",{prevIndex:i,index:e,fromTouch:t,fromThumb:s})},this.s.speed)):(d.loadContent(e,!0,d.s.backdropDuration),d.lgBusy=!1,l.default.trigger(d.el,"onAfterSlide",{prevIndex:i,index:e,fromTouch:t,fromThumb:s})),d.lGalleryOn=!0,this.s.counter&&document.getElementById("lg-counter-current")&&(document.getElementById("lg-counter-current").innerHTML=e+1)}}},s.prototype.goToNextSlide=function(e){var t=this;t.lgBusy||(t.index+1<t.___slide.length?(t.index++,l.default.trigger(t.el,"onBeforeNextSlide",{index:t.index}),t.slide(t.index,e,!1)):t.s.loop?(t.index=0,l.default.trigger(t.el,"onBeforeNextSlide",{index:t.index}),t.slide(t.index,e,!1)):t.s.slideEndAnimatoin&&(l.default.addClass(t.outer,"lg-right-end"),setTimeout(function(){l.default.removeClass(t.outer,"lg-right-end")},400)))},s.prototype.goToPrevSlide=function(e){var t=this;t.lgBusy||(t.index>0?(t.index--,l.default.trigger(t.el,"onBeforePrevSlide",{index:t.index,fromTouch:e}),t.slide(t.index,e,!1)):t.s.loop?(t.index=t.items.length-1,l.default.trigger(t.el,"onBeforePrevSlide",{index:t.index,fromTouch:e}),t.slide(t.index,e,!1)):t.s.slideEndAnimatoin&&(l.default.addClass(t.outer,"lg-left-end"),setTimeout(function(){l.default.removeClass(t.outer,"lg-left-end")},400)))},s.prototype.keyPress=function(){var e=this;this.items.length>1&&l.default.on(window,"keyup.lg",function(t){e.items.length>1&&(37===t.keyCode&&(t.preventDefault(),e.goToPrevSlide()),39===t.keyCode&&(t.preventDefault(),e.goToNextSlide()))}),l.default.on(window,"keydown.lg",function(t){e.s.escKey===!0&&27===t.keyCode&&(t.preventDefault(),l.default.hasClass(e.outer,"lg-thumb-open")?l.default.removeClass(e.outer,"lg-thumb-open"):e.destroy())})},s.prototype.arrow=function(){var e=this;l.default.on(this.outer.querySelector(".lg-prev"),"click.lg",function(){e.goToPrevSlide()}),l.default.on(this.outer.querySelector(".lg-next"),"click.lg",function(){e.goToNextSlide()})},s.prototype.arrowDisable=function(e){if(!this.s.loop&&this.s.hideControlOnEnd){var t=this.outer.querySelector(".lg-next"),s=this.outer.querySelector(".lg-prev");e+1<this.___slide.length?(t.removeAttribute("disabled"),l.default.removeClass(t,"disabled")):(t.setAttribute("disabled","disabled"),l.default.addClass(t,"disabled")),e>0?(s.removeAttribute("disabled"),l.default.removeClass(s,"disabled")):(t.setAttribute("disabled","disabled"),l.default.addClass(t,"disabled"))}},s.prototype.setTranslate=function(e,t,s){this.s.useLeft?e.style.left=t:l.default.setVendor(e,"Transform","translate3d("+t+"px, "+s+"px, 0px)")},s.prototype.touchMove=function(e,t){var s=t-e;Math.abs(s)>15&&(l.default.addClass(this.outer,"lg-dragging"),this.setTranslate(this.___slide[this.index],s,0),this.setTranslate(document.querySelector(".lg-prev-slide"),-this.___slide[this.index].clientWidth+s,0),this.setTranslate(document.querySelector(".lg-next-slide"),this.___slide[this.index].clientWidth+s,0))},s.prototype.touchEnd=function(e){var t=this;"lg-slide"!==t.s.mode&&l.default.addClass(t.outer,"lg-slide");for(var s=0;s<this.___slide.length;s++)l.default.hasClass(this.___slide[s],"lg-current")||l.default.hasClass(this.___slide[s],"lg-prev-slide")||l.default.hasClass(this.___slide[s],"lg-next-slide")||(this.___slide[s].style.opacity="0");setTimeout(function(){l.default.removeClass(t.outer,"lg-dragging"),e<0&&Math.abs(e)>t.s.swipeThreshold?t.goToNextSlide(!0):e>0&&Math.abs(e)>t.s.swipeThreshold?t.goToPrevSlide(!0):Math.abs(e)<5&&l.default.trigger(t.el,"onSlideClick");for(var s=0;s<t.___slide.length;s++)t.___slide[s].removeAttribute("style")}),setTimeout(function(){l.default.hasClass(t.outer,"lg-dragging")||"lg-slide"===t.s.mode||l.default.removeClass(t.outer,"lg-slide")},t.s.speed+100)},s.prototype.enableSwipe=function(){var e=this,t=0,s=0,i=!1;if(e.s.enableSwipe&&e.isTouch&&e.doCss()){for(var o=0;o<e.___slide.length;o++)l.default.on(e.___slide[o],"touchstart.lg",function(s){l.default.hasClass(e.outer,"lg-zoomed")||e.lgBusy||(s.preventDefault(),e.manageSwipeClass(),t=s.targetTouches[0].pageX)});for(var d=0;d<e.___slide.length;d++)l.default.on(e.___slide[d],"touchmove.lg",function(o){l.default.hasClass(e.outer,"lg-zoomed")||(o.preventDefault(),s=o.targetTouches[0].pageX,e.touchMove(t,s),i=!0)});for(var r=0;r<e.___slide.length;r++)l.default.on(e.___slide[r],"touchend.lg",function(){l.default.hasClass(e.outer,"lg-zoomed")||(i?(i=!1,e.touchEnd(s-t)):l.default.trigger(e.el,"onSlideClick"))})}},s.prototype.enableDrag=function(){var e=this,t=0,s=0,i=!1,o=!1;if(e.s.enableDrag&&!e.isTouch&&e.doCss()){for(var d=0;d<e.___slide.length;d++)l.default.on(e.___slide[d],"mousedown.lg",function(s){l.default.hasClass(e.outer,"lg-zoomed")||(l.default.hasClass(s.target,"lg-object")||l.default.hasClass(s.target,"lg-video-play"))&&(s.preventDefault(),e.lgBusy||(e.manageSwipeClass(),t=s.pageX,i=!0,e.outer.scrollLeft+=1,e.outer.scrollLeft-=1,l.default.removeClass(e.outer,"lg-grab"),l.default.addClass(e.outer,"lg-grabbing"),l.default.trigger(e.el,"onDragstart")))});l.default.on(window,"mousemove.lg",function(d){i&&(o=!0,s=d.pageX,e.touchMove(t,s),l.default.trigger(e.el,"onDragmove"))}),l.default.on(window,"mouseup.lg",function(d){o?(o=!1,e.touchEnd(s-t),l.default.trigger(e.el,"onDragend")):(l.default.hasClass(d.target,"lg-object")||l.default.hasClass(d.target,"lg-video-play"))&&l.default.trigger(e.el,"onSlideClick"),i&&(i=!1,l.default.removeClass(e.outer,"lg-grabbing"),l.default.addClass(e.outer,"lg-grab"))})}},s.prototype.manageSwipeClass=function(){var e=this.index+1,t=this.index-1,s=this.___slide.length;this.s.loop&&(0===this.index?t=s-1:this.index===s-1&&(e=0));for(var i=0;i<this.___slide.length;i++)l.default.removeClass(this.___slide[i],"lg-next-slide"),l.default.removeClass(this.___slide[i],"lg-prev-slide");t>-1&&l.default.addClass(this.___slide[t],"lg-prev-slide"),l.default.addClass(this.___slide[e],"lg-next-slide")},s.prototype.mousewheel=function(){var e=this;l.default.on(e.outer,"mousewheel.lg",function(t){t.deltaY&&(t.deltaY>0?e.goToPrevSlide():e.goToNextSlide(),t.preventDefault())})},s.prototype.closeGallery=function(){var e=this,t=!1;l.default.on(this.outer.querySelector(".lg-close"),"click.lg",function(){e.destroy()}),e.s.closable&&(l.default.on(e.outer,"mousedown.lg",function(e){t=!!(l.default.hasClass(e.target,"lg-outer")||l.default.hasClass(e.target,"lg-item")||l.default.hasClass(e.target,"lg-img-wrap"))}),l.default.on(e.outer,"mouseup.lg",function(s){(l.default.hasClass(s.target,"lg-outer")||l.default.hasClass(s.target,"lg-item")||l.default.hasClass(s.target,"lg-img-wrap")&&t)&&(l.default.hasClass(e.outer,"lg-dragging")||e.destroy())}))},s.prototype.destroy=function(e){var t=this;if(e||l.default.trigger(t.el,"onBeforeClose"),document.body.scrollTop=t.prevScrollTop,document.documentElement.scrollTop=t.prevScrollTop,e){if(!t.s.dynamic)for(var s=0;s<this.items.length;s++)l.default.off(this.items[s],".lg"),l.default.off(this.items[s],".lgcustom");var i=t.el.getAttribute("lg-uid");delete window.lgData[i],t.el.removeAttribute("lg-uid")}l.default.off(this.el,".lgtm");for(var o in window.lgModules)t.modules[o]&&t.modules[o].destroy();this.lGalleryOn=!1,clearTimeout(t.hideBartimeout),this.hideBartimeout=!1,l.default.off(window,".lg"),l.default.removeClass(document.body,"lg-on"),l.default.removeClass(document.body,"lg-from-hash"),t.outer&&l.default.removeClass(t.outer,"lg-visible"),l.default.removeClass(document.querySelector(".lg-backdrop"),"in"),setTimeout(function(){try{t.outer&&t.outer.parentNode.removeChild(t.outer),document.querySelector(".lg-backdrop")&&document.querySelector(".lg-backdrop").parentNode.removeChild(document.querySelector(".lg-backdrop")),e||l.default.trigger(t.el,"onCloseAfter")}catch(e){}},t.s.backdropDuration+50)},window.lightGallery=function(e,t){if(e)try{if(e.getAttribute("lg-uid"))try{window.lgData[e.getAttribute("lg-uid")].init()}catch(e){console.error("lightGallery has not initiated properly")}else{var l="lg"+window.lgData.uid++;window.lgData[l]=new s(e,t),e.setAttribute("lg-uid",l)}}catch(e){console.error("lightGallery has not initiated properly")}}})},{"./lg-utils":1}]},{},[2])(2)});/**!
 * lg-thumbnail.js | 0.0.4 | August 9th 2016
 * http://sachinchoolur.github.io/lg-thumbnail.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.LgThumbnail=t()}}(function(){var t,e,i;return function t(e,i,o){function u(s,l){if(!i[s]){if(!e[s]){var h="function"==typeof require&&require;if(!l&&h)return h(s,!0);if(r)return r(s,!0);var n=new Error("Cannot find module '"+s+"'");throw n.code="MODULE_NOT_FOUND",n}var a=i[s]={exports:{}};e[s][0].call(a.exports,function(t){var i=e[s][1][t];return u(i?i:t)},a,a.exports,t,e,i,o)}return i[s].exports}for(var r="function"==typeof require&&require,s=0;s<o.length;s++)u(o[s]);return u}({1:[function(e,i,o){!function(e,i){if("function"==typeof t&&t.amd)t([],i);else if("undefined"!=typeof o)i();else{var u={exports:{}};i(),e.lgThumbnail=u.exports}}(this,function(){"use strict";var t=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var i=arguments[e];for(var o in i)Object.prototype.hasOwnProperty.call(i,o)&&(t[o]=i[o])}return t},e={thumbnail:!0,animateThumb:!0,currentPagerPosition:"middle",thumbWidth:100,thumbContHeight:100,thumbMargin:5,exThumbImage:!1,showThumbByDefault:!0,toggleThumb:!0,pullCaptionUp:!0,enableThumbDrag:!0,enableThumbSwipe:!0,swipeThreshold:50,loadYoutubeThumbnail:!0,youtubeThumbSize:1,loadVimeoThumbnail:!0,vimeoThumbSize:"thumbnail_small",loadDailymotionThumbnail:!0},i=function i(o){return this.el=o,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=t({},e,this.core.s),this.thumbOuter=null,this.thumbOuterWidth=0,this.thumbTotalWidth=this.core.items.length*(this.core.s.thumbWidth+this.core.s.thumbMargin),this.thumbIndex=this.core.index,this.left=0,this.init(),this};i.prototype.init=function(){var t=this;this.core.s.thumbnail&&this.core.items.length>1&&(this.core.s.showThumbByDefault&&setTimeout(function(){utils.addClass(t.core.outer,"lg-thumb-open")},700),this.core.s.pullCaptionUp&&utils.addClass(this.core.outer,"lg-pull-caption-up"),this.build(),this.core.s.animateThumb?(this.core.s.enableThumbDrag&&!this.core.isTouch&&this.core.doCss()&&this.enableThumbDrag(),this.core.s.enableThumbSwipe&&this.core.isTouch&&this.core.doCss()&&this.enableThumbSwipe(),this.thumbClickable=!1):this.thumbClickable=!0,this.toggle(),this.thumbkeyPress())},i.prototype.build=function(){function t(t,u,r){var s=e.core.isVideo(t,r)||{},l,h="";s.youtube||s.vimeo||s.dailymotion?s.youtube?l=e.core.s.loadYoutubeThumbnail?"//img.youtube.com/vi/"+s.youtube[1]+"/"+e.core.s.youtubeThumbSize+".jpg":u:s.vimeo?e.core.s.loadVimeoThumbnail?(l="//i.vimeocdn.com/video/error_"+o+".jpg",h=s.vimeo[1]):l=u:s.dailymotion&&(l=e.core.s.loadDailymotionThumbnail?"//www.dailymotion.com/thumbnail/video/"+s.dailymotion[1]:u):l=u,i+='<div data-vimeo-id="'+h+'" class="lg-thumb-item" style="width:'+e.core.s.thumbWidth+"px; margin-right: "+e.core.s.thumbMargin+'px"><img src="'+l+'" /></div>',h=""}var e=this,i="",o="",u,r='<div class="lg-thumb-outer"><div class="lg-thumb group"></div></div>';switch(this.core.s.vimeoThumbSize){case"thumbnail_large":o="640";break;case"thumbnail_medium":o="200x150";break;case"thumbnail_small":o="100x75"}if(utils.addClass(e.core.outer,"lg-has-thumb"),e.core.outer.querySelector(".lg").insertAdjacentHTML("beforeend",r),e.thumbOuter=e.core.outer.querySelector(".lg-thumb-outer"),e.thumbOuterWidth=e.thumbOuter.offsetWidth,e.core.s.animateThumb&&(e.core.outer.querySelector(".lg-thumb").style.width=e.thumbTotalWidth+"px",e.core.outer.querySelector(".lg-thumb").style.position="relative"),this.core.s.animateThumb&&(e.thumbOuter.style.height=e.core.s.thumbContHeight+"px"),e.core.s.dynamic)for(var s=0;s<e.core.s.dynamicEl.length;s++)t(e.core.s.dynamicEl[s].src,e.core.s.dynamicEl[s].thumb,s);else for(var l=0;l<e.core.items.length;l++)e.core.s.exThumbImage?t(e.core.items[l].getAttribute("href")||e.core.items[l].getAttribute("data-src"),e.core.items[l].getAttribute(e.core.s.exThumbImage),l):t(e.core.items[l].getAttribute("href")||e.core.items[l].getAttribute("data-src"),e.core.items[l].querySelector("img").getAttribute("src"),l);e.core.outer.querySelector(".lg-thumb").innerHTML=i,u=e.core.outer.querySelectorAll(".lg-thumb-item");for(var h=0;h<u.length;h++)!function(t){var i=u[t],o=i.getAttribute("data-vimeo-id");if(o){window["lgJsonP"+e.el.getAttribute("lg-uid")+h]=function(t){i.querySelector("img").setAttribute("src",t[0][e.core.s.vimeoThumbSize])};var r=document.createElement("script");r.className="lg-script",r.src="//www.vimeo.com/api/v2/video/"+o+".json?callback=lgJsonP"+e.el.getAttribute("lg-uid")+h,document.body.appendChild(r)}}(h);utils.addClass(u[e.core.index],"active"),utils.on(e.core.el,"onBeforeSlide.lgtm",function(){for(var t=0;t<u.length;t++)utils.removeClass(u[t],"active");utils.addClass(u[e.core.index],"active")});for(var n=0;n<u.length;n++)!function(t){utils.on(u[t],"click.lg touchend.lg",function(){setTimeout(function(){(e.thumbClickable&&!e.core.lgBusy||!e.core.doCss())&&(e.core.index=t,e.core.slide(e.core.index,!1,!0))},50)})}(n);utils.on(e.core.el,"onBeforeSlide.lgtm",function(){e.animateThumb(e.core.index)}),utils.on(window,"resize.lgthumb orientationchange.lgthumb",function(){setTimeout(function(){e.animateThumb(e.core.index),e.thumbOuterWidth=e.thumbOuter.offsetWidth},200)})},i.prototype.setTranslate=function(t){utils.setVendor(this.core.outer.querySelector(".lg-thumb"),"Transform","translate3d(-"+t+"px, 0px, 0px)")},i.prototype.animateThumb=function(t){var e=this.core.outer.querySelector(".lg-thumb");if(this.core.s.animateThumb){var i;switch(this.core.s.currentPagerPosition){case"left":i=0;break;case"middle":i=this.thumbOuterWidth/2-this.core.s.thumbWidth/2;break;case"right":i=this.thumbOuterWidth-this.core.s.thumbWidth}this.left=(this.core.s.thumbWidth+this.core.s.thumbMargin)*t-1-i,this.left>this.thumbTotalWidth-this.thumbOuterWidth&&(this.left=this.thumbTotalWidth-this.thumbOuterWidth),this.left<0&&(this.left=0),this.core.lGalleryOn?(utils.hasClass(e,"on")||utils.setVendor(this.core.outer.querySelector(".lg-thumb"),"TransitionDuration",this.core.s.speed+"ms"),this.core.doCss()||(e.style.left=-this.left+"px")):this.core.doCss()||(e.style.left=-this.left+"px"),this.setTranslate(this.left)}},i.prototype.enableThumbDrag=function(){var t=this,e=0,i=0,o=!1,u=!1,r=0;utils.addClass(t.thumbOuter,"lg-grab"),utils.on(t.core.outer.querySelector(".lg-thumb"),"mousedown.lgthumb",function(i){t.thumbTotalWidth>t.thumbOuterWidth&&(i.preventDefault(),e=i.pageX,o=!0,t.core.outer.scrollLeft+=1,t.core.outer.scrollLeft-=1,t.thumbClickable=!1,utils.removeClass(t.thumbOuter,"lg-grab"),utils.addClass(t.thumbOuter,"lg-grabbing"))}),utils.on(window,"mousemove.lgthumb",function(s){o&&(r=t.left,u=!0,i=s.pageX,utils.addClass(t.thumbOuter,"lg-dragging"),r-=i-e,r>t.thumbTotalWidth-t.thumbOuterWidth&&(r=t.thumbTotalWidth-t.thumbOuterWidth),r<0&&(r=0),t.setTranslate(r))}),utils.on(window,"mouseup.lgthumb",function(){u?(u=!1,utils.removeClass(t.thumbOuter,"lg-dragging"),t.left=r,Math.abs(i-e)<t.core.s.swipeThreshold&&(t.thumbClickable=!0)):t.thumbClickable=!0,o&&(o=!1,utils.removeClass(t.thumbOuter,"lg-grabbing"),utils.addClass(t.thumbOuter,"lg-grab"))})},i.prototype.enableThumbSwipe=function(){var t=this,e=0,i=0,o=!1,u=0;utils.on(t.core.outer.querySelector(".lg-thumb"),"touchstart.lg",function(i){t.thumbTotalWidth>t.thumbOuterWidth&&(i.preventDefault(),e=i.targetTouches[0].pageX,t.thumbClickable=!1)}),utils.on(t.core.outer.querySelector(".lg-thumb"),"touchmove.lg",function(r){t.thumbTotalWidth>t.thumbOuterWidth&&(r.preventDefault(),i=r.targetTouches[0].pageX,o=!0,utils.addClass(t.thumbOuter,"lg-dragging"),u=t.left,u-=i-e,u>t.thumbTotalWidth-t.thumbOuterWidth&&(u=t.thumbTotalWidth-t.thumbOuterWidth),u<0&&(u=0),t.setTranslate(u))}),utils.on(t.core.outer.querySelector(".lg-thumb"),"touchend.lg",function(){t.thumbTotalWidth>t.thumbOuterWidth&&o?(o=!1,utils.removeClass(t.thumbOuter,"lg-dragging"),Math.abs(i-e)<t.core.s.swipeThreshold&&(t.thumbClickable=!0),t.left=u):t.thumbClickable=!0})},i.prototype.toggle=function(){var t=this;t.core.s.toggleThumb&&(utils.addClass(t.core.outer,"lg-can-toggle"),t.thumbOuter.insertAdjacentHTML("beforeend",'<span class="lg-toggle-thumb lg-icon"></span>'),utils.on(t.core.outer.querySelector(".lg-toggle-thumb"),"click.lg",function(){utils.hasClass(t.core.outer,"lg-thumb-open")?utils.removeClass(t.core.outer,"lg-thumb-open"):utils.addClass(t.core.outer,"lg-thumb-open")}))},i.prototype.thumbkeyPress=function(){var t=this;utils.on(window,"keydown.lgthumb",function(e){38===e.keyCode?(e.preventDefault(),utils.addClass(t.core.outer,"lg-thumb-open")):40===e.keyCode&&(e.preventDefault(),utils.removeClass(t.core.outer,"lg-thumb-open"))})},i.prototype.destroy=function(){if(this.core.s.thumbnail&&this.core.items.length>1){utils.off(window,".lgthumb"),this.thumbOuter.parentNode.removeChild(this.thumbOuter),utils.removeClass(this.core.outer,"lg-has-thumb");for(var t=document.getElementsByClassName("lg-script");t[0];)t[0].parentNode.removeChild(t[0])}},window.lgModules.thumbnail=i})},{}]},{},[1])(1)});/**!
 * lg-pager.js | 0.0.1 | August 1st 2016
 * http://sachinchoolur.github.io/lg-pager.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t.LgPager=e()}}(function(){var e,t,r;return function e(t,r,n){function o(i,a){if(!r[i]){if(!t[i]){var l="function"==typeof require&&require;if(!a&&l)return l(i,!0);if(s)return s(i,!0);var c=new Error("Cannot find module '"+i+"'");throw c.code="MODULE_NOT_FOUND",c}var u=r[i]={exports:{}};t[i][0].call(u.exports,function(e){var r=t[i][1][e];return o(r?r:e)},u,u.exports,e,t,r,n)}return r[i].exports}for(var s="function"==typeof require&&require,i=0;i<n.length;i++)o(n[i]);return o}({1:[function(t,r,n){!function(t,r){if("function"==typeof e&&e.amd)e([],r);else if("undefined"!=typeof n)r();else{var o={exports:{}};r(),t.lgPager=o.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n])}return e},t={pager:!1},r=function r(n){return this.el=n,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=e({},t,this.core.s),this.core.s.pager&&this.core.items.length>1&&this.init(),this};r.prototype.init=function(){var e=this,t="",r,n,o;if(e.core.outer.querySelector(".lg").insertAdjacentHTML("beforeend",'<div class="lg-pager-outer"></div>'),e.core.s.dynamic)for(var s=0;s<e.core.s.dynamicEl.length;s++)t+='<span class="lg-pager-cont"> <span class="lg-pager"></span><div class="lg-pager-thumb-cont"><span class="lg-caret"></span> <img src="'+e.core.s.dynamicEl[s].thumb+'" /></div></span>';else for(var i=0;i<e.core.items.length;i++)t+=e.core.s.exThumbImage?'<span class="lg-pager-cont"> <span class="lg-pager"></span><div class="lg-pager-thumb-cont"><span class="lg-caret"></span> <img src="'+e.core.items[i].getAttribute(e.core.s.exThumbImage)+'" /></div></span>':'<span class="lg-pager-cont"> <span class="lg-pager"></span><div class="lg-pager-thumb-cont"><span class="lg-caret"></span> <img src="'+e.core.items[i].querySelector("img").getAttribute("src")+'" /></div></span>';n=e.core.outer.querySelector(".lg-pager-outer"),n.innerHTML=t,r=e.core.outer.querySelectorAll(".lg-pager-cont");for(var a=0;a<r.length;a++)!function(t){utils.on(r[t],"click.lg touchend.lg",function(){e.core.index=t,e.core.slide(e.core.index,!1,!1)})}(a);utils.on(n,"mouseover.lg",function(){clearTimeout(o),utils.addClass(n,"lg-pager-hover")}),utils.on(n,"mouseout.lg",function(){o=setTimeout(function(){utils.removeClass(n,"lg-pager-hover")})}),utils.on(e.core.el,"onBeforeSlide.lgtm",function(e){for(var t=0;t<r.length;t++)utils.removeClass(r[t],"lg-pager-active"),e.detail.index===t&&utils.addClass(r[t],"lg-pager-active")})},r.prototype.destroy=function(){},window.lgModules.pager=r})},{}]},{},[1])(1)});/**!
 * lg-autoplay.js | 0.0.1 | August 1st 2016
 * http://sachinchoolur.github.io/lg-autoplay.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t.LgAutoplay=e()}}(function(){var e,t,o;return function e(t,o,r){function s(n,u){if(!o[n]){if(!t[n]){var i="function"==typeof require&&require;if(!u&&i)return i(n,!0);if(l)return l(n,!0);var c=new Error("Cannot find module '"+n+"'");throw c.code="MODULE_NOT_FOUND",c}var a=o[n]={exports:{}};t[n][0].call(a.exports,function(e){var o=t[n][1][e];return s(o?o:e)},a,a.exports,e,t,o,r)}return o[n].exports}for(var l="function"==typeof require&&require,n=0;n<r.length;n++)s(r[n]);return s}({1:[function(t,o,r){!function(t,o){if("function"==typeof e&&e.amd)e([],o);else if("undefined"!=typeof r)o();else{var s={exports:{}};o(),t.lgAutoplay=s.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var r in o)Object.prototype.hasOwnProperty.call(o,r)&&(e[r]=o[r])}return e},t={autoplay:!1,pause:5e3,progressBar:!0,fourceAutoplay:!1,autoplayControls:!0,appendAutoplayControlsTo:".lg-toolbar"},o=function o(r){return this.el=r,this.core=window.lgData[this.el.getAttribute("lg-uid")],!(this.core.items.length<2)&&(this.core.s=e({},t,this.core.s),this.interval=!1,this.fromAuto=!0,this.canceledOnTouch=!1,this.fourceAutoplayTemp=this.core.s.fourceAutoplay,this.core.doCss()||(this.core.s.progressBar=!1),this.init(),this)};o.prototype.init=function(){var e=this;e.core.s.autoplayControls&&e.controls(),e.core.s.progressBar&&e.core.outer.querySelector(".lg").insertAdjacentHTML("beforeend",'<div class="lg-progress-bar"><div class="lg-progress"></div></div>'),e.progress(),e.core.s.autoplay&&e.startlAuto(),utils.on(e.el,"onDragstart.lgtm touchstart.lgtm",function(){e.interval&&(e.cancelAuto(),e.canceledOnTouch=!0)}),utils.on(e.el,"onDragend.lgtm touchend.lgtm onSlideClick.lgtm",function(){!e.interval&&e.canceledOnTouch&&(e.startlAuto(),e.canceledOnTouch=!1)})},o.prototype.progress=function(){var e=this,t,o;utils.on(e.el,"onBeforeSlide.lgtm",function(){e.core.s.progressBar&&e.fromAuto&&(t=e.core.outer.querySelector(".lg-progress-bar"),o=e.core.outer.querySelector(".lg-progress"),e.interval&&(o.removeAttribute("style"),utils.removeClass(t,"lg-start"),setTimeout(function(){utils.setVendor(o,"Transition","width "+(e.core.s.speed+e.core.s.pause)+"ms ease 0s"),utils.addClass(t,"lg-start")},20))),e.fromAuto||e.core.s.fourceAutoplay||e.cancelAuto(),e.fromAuto=!1})},o.prototype.controls=function(){var e=this,t='<span class="lg-autoplay-button lg-icon"></span>';e.core.outer.querySelector(this.core.s.appendAutoplayControlsTo).insertAdjacentHTML("beforeend",t),utils.on(e.core.outer.querySelector(".lg-autoplay-button"),"click.lg",function(){utils.hasClass(e.core.outer,"lg-show-autoplay")?(e.cancelAuto(),e.core.s.fourceAutoplay=!1):e.interval||(e.startlAuto(),e.core.s.fourceAutoplay=e.fourceAutoplayTemp)})},o.prototype.startlAuto=function(){var e=this;utils.setVendor(e.core.outer.querySelector(".lg-progress"),"Transition","width "+(e.core.s.speed+e.core.s.pause)+"ms ease 0s"),utils.addClass(e.core.outer,"lg-show-autoplay"),utils.addClass(e.core.outer.querySelector(".lg-progress-bar"),"lg-start"),e.interval=setInterval(function(){e.core.index+1<e.core.items.length?e.core.index++:e.core.index=0,e.fromAuto=!0,e.core.slide(e.core.index,!1,!1)},e.core.s.speed+e.core.s.pause)},o.prototype.cancelAuto=function(){clearInterval(this.interval),this.interval=!1,this.core.outer.querySelector(".lg-progress")&&this.core.outer.querySelector(".lg-progress").removeAttribute("style"),utils.removeClass(this.core.outer,"lg-show-autoplay"),utils.removeClass(this.core.outer.querySelector(".lg-progress-bar"),"lg-start")},o.prototype.destroy=function(){this.cancelAuto(),this.core.outer.querySelector(".lg-progress-bar")&&this.core.outer.querySelector(".lg-progress-bar").parentNode.removeChild(this.core.outer.querySelector(".lg-progress-bar"))},window.lgModules.autoplay=o})},{}]},{},[1])(1)});/**!
 * lg-fullscreen.js | 0.0.1 | August 1st 2016
 * http://sachinchoolur.github.io/lg-fullscreen.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;n="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,n.LgFullscreen=e()}}(function(){var e,n,l;return function e(n,l,t){function r(o,c){if(!l[o]){if(!n[o]){var s="function"==typeof require&&require;if(!c&&s)return s(o,!0);if(u)return u(o,!0);var i=new Error("Cannot find module '"+o+"'");throw i.code="MODULE_NOT_FOUND",i}var f=l[o]={exports:{}};n[o][0].call(f.exports,function(e){var l=n[o][1][e];return r(l?l:e)},f,f.exports,e,n,l,t)}return l[o].exports}for(var u="function"==typeof require&&require,o=0;o<t.length;o++)r(t[o]);return r}({1:[function(n,l,t){!function(n,l){if("function"==typeof e&&e.amd)e([],l);else if("undefined"!=typeof t)l();else{var r={exports:{}};l(),n.lgFullscreen=r.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var n=1;n<arguments.length;n++){var l=arguments[n];for(var t in l)Object.prototype.hasOwnProperty.call(l,t)&&(e[t]=l[t])}return e},n={fullScreen:!0},l=function l(t){return this.el=t,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=e({},n,this.core.s),this.init(),this};l.prototype.init=function(){var e="";if(this.core.s.fullScreen){if(!(document.fullscreenEnabled||document.webkitFullscreenEnabled||document.mozFullScreenEnabled||document.msFullscreenEnabled))return;e='<span class="lg-fullscreen lg-icon"></span>',this.core.outer.querySelector(".lg-toolbar").insertAdjacentHTML("beforeend",e),this.fullScreen()}},l.prototype.requestFullscreen=function(){var e=document.documentElement;e.requestFullscreen?e.requestFullscreen():e.msRequestFullscreen?e.msRequestFullscreen():e.mozRequestFullScreen?e.mozRequestFullScreen():e.webkitRequestFullscreen&&e.webkitRequestFullscreen()},l.prototype.exitFullscreen=function(){document.exitFullscreen?document.exitFullscreen():document.msExitFullscreen?document.msExitFullscreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.webkitExitFullscreen&&document.webkitExitFullscreen()},l.prototype.fullScreen=function(){var e=this;utils.on(document,"fullscreenchange.lgfullscreen webkitfullscreenchange.lgfullscreen mozfullscreenchange.lgfullscreen MSFullscreenChange.lgfullscreen",function(){utils.hasClass(e.core.outer,"lg-fullscreen-on")?utils.removeClass(e.core.outer,"lg-fullscreen-on"):utils.addClass(e.core.outer,"lg-fullscreen-on")}),utils.on(this.core.outer.querySelector(".lg-fullscreen"),"click.lg",function(){document.fullscreenElement||document.mozFullScreenElement||document.webkitFullscreenElement||document.msFullscreenElement?e.exitFullscreen():e.requestFullscreen()})},l.prototype.destroy=function(){this.exitFullscreen(),utils.off(document,".lgfullscreen")},window.lgModules.fullscreen=l})},{}]},{},[1])(1)});/**!
 * lg-zoom.js | 0.0.2 | August 4th 2016
 * http://sachinchoolur.github.io/lg-zoom.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t.LgZoom=e()}}(function(){var e,t,o;return function e(t,o,r){function i(a,s){if(!o[a]){if(!t[a]){var n="function"==typeof require&&require;if(!s&&n)return n(a,!0);if(l)return l(a,!0);var c=new Error("Cannot find module '"+a+"'");throw c.code="MODULE_NOT_FOUND",c}var u=o[a]={exports:{}};t[a][0].call(u.exports,function(e){var o=t[a][1][e];return i(o?o:e)},u,u.exports,e,t,o,r)}return o[a].exports}for(var l="function"==typeof require&&require,a=0;a<r.length;a++)i(r[a]);return i}({1:[function(t,o,r){!function(t,o){if("function"==typeof e&&e.amd)e([],o);else if("undefined"!=typeof r)o();else{var i={exports:{}};o(),t.lgZoom=i.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var r in o)Object.prototype.hasOwnProperty.call(o,r)&&(e[r]=o[r])}return e},t={scale:1,zoom:!0,actualSize:!0,enableZoomAfter:300},o=function o(r){return this.el=r,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=e({},t,this.core.s),this.core.s.zoom&&this.core.doCss()&&(this.init(),this.zoomabletimeout=!1,this.pageX=window.innerWidth/2,this.pageY=window.innerHeight/2+(document.documentElement.scrollTop||document.body.scrollTop)),this};o.prototype.init=function(){var e=this,t='<span id="lg-zoom-in" class="lg-icon"></span><span id="lg-zoom-out" class="lg-icon"></span>';e.core.s.actualSize&&(t+='<span id="lg-actual-size" class="lg-icon"></span>'),this.core.outer.querySelector(".lg-toolbar").insertAdjacentHTML("beforeend",t),utils.on(e.core.el,"onSlideItemLoad.lgtmzoom",function(t){var o=e.core.s.enableZoomAfter+t.detail.delay;utils.hasClass(document.body,"lg-from-hash")&&t.detail.delay?o=0:utils.removeClass(document.body,"lg-from-hash"),e.zoomabletimeout=setTimeout(function(){utils.addClass(e.core.___slide[t.detail.index],"lg-zoomable")},o+30)});var o=1,r=function t(o){var r=e.core.outer.querySelector(".lg-current .lg-image"),i,l,a=(window.innerWidth-r.clientWidth)/2,s=(window.innerHeight-r.clientHeight)/2+(document.documentElement.scrollTop||document.body.scrollTop);i=e.pageX-a,l=e.pageY-s;var n=(o-1)*i,c=(o-1)*l;utils.setVendor(r,"Transform","scale3d("+o+", "+o+", 1)"),r.setAttribute("data-scale",o),r.parentElement.style.left=-n+"px",r.parentElement.style.top=-c+"px",r.parentElement.setAttribute("data-x",n),r.parentElement.setAttribute("data-y",c)},i=function t(){o>1?utils.addClass(e.core.outer,"lg-zoomed"):e.resetZoom(),o<1&&(o=1),r(o)},l=function t(r,l,a,s){var n=l.clientWidth,c;c=e.core.s.dynamic?e.core.s.dynamicEl[a].width||l.naturalWidth||n:e.core.items[a].getAttribute("data-width")||l.naturalWidth||n;var u;utils.hasClass(e.core.outer,"lg-zoomed")?o=1:c>n&&(u=c/n,o=u||2),s?(e.pageX=window.innerWidth/2,e.pageY=window.innerHeight/2+(document.documentElement.scrollTop||document.body.scrollTop)):(e.pageX=r.pageX||r.targetTouches[0].pageX,e.pageY=r.pageY||r.targetTouches[0].pageY),i(),setTimeout(function(){utils.removeClass(e.core.outer,"lg-grabbing"),utils.addClass(e.core.outer,"lg-grab")},10)},a=!1;utils.on(e.core.el,"onAferAppendSlide.lgtmzoom",function(t){var o=t.detail.index,r=e.core.___slide[o].querySelector(".lg-image");e.core.isTouch||utils.on(r,"dblclick",function(e){l(e,r,o)}),e.core.isTouch&&utils.on(r,"touchstart",function(e){a?(clearTimeout(a),a=null,l(e,r,o)):a=setTimeout(function(){a=null},300),e.preventDefault()})}),utils.on(window,"resize.lgzoom scroll.lgzoom orientationchange.lgzoom",function(){e.pageX=window.innerWidth/2,e.pageY=window.innerHeight/2+(document.documentElement.scrollTop||document.body.scrollTop),r(o)}),utils.on(document.getElementById("lg-zoom-out"),"click.lg",function(){e.core.outer.querySelector(".lg-current .lg-image")&&(o-=e.core.s.scale,i())}),utils.on(document.getElementById("lg-zoom-in"),"click.lg",function(){e.core.outer.querySelector(".lg-current .lg-image")&&(o+=e.core.s.scale,i())}),utils.on(document.getElementById("lg-actual-size"),"click.lg",function(t){l(t,e.core.___slide[e.core.index].querySelector(".lg-image"),e.core.index,!0)}),utils.on(e.core.el,"onBeforeSlide.lgtm",function(){o=1,e.resetZoom()}),e.core.isTouch||e.zoomDrag(),e.core.isTouch&&e.zoomSwipe()},o.prototype.resetZoom=function(){utils.removeClass(this.core.outer,"lg-zoomed");for(var e=0;e<this.core.___slide.length;e++)this.core.___slide[e].querySelector(".lg-img-wrap")&&(this.core.___slide[e].querySelector(".lg-img-wrap").removeAttribute("style"),this.core.___slide[e].querySelector(".lg-img-wrap").removeAttribute("data-x"),this.core.___slide[e].querySelector(".lg-img-wrap").removeAttribute("data-y"));for(var t=0;t<this.core.___slide.length;t++)this.core.___slide[t].querySelector(".lg-image")&&(this.core.___slide[t].querySelector(".lg-image").removeAttribute("style"),this.core.___slide[t].querySelector(".lg-image").removeAttribute("data-scale"));this.pageX=window.innerWidth/2,this.pageY=window.innerHeight/2+(document.documentElement.scrollTop||document.body.scrollTop)},o.prototype.zoomSwipe=function(){for(var e=this,t={},o={},r=!1,i=!1,l=!1,a=0;a<e.core.___slide.length;a++)utils.on(e.core.___slide[a],"touchstart.lg",function(o){if(utils.hasClass(e.core.outer,"lg-zoomed")){var r=e.core.___slide[e.core.index].querySelector(".lg-object");l=r.offsetHeight*r.getAttribute("data-scale")>e.core.outer.querySelector(".lg").clientHeight,i=r.offsetWidth*r.getAttribute("data-scale")>e.core.outer.querySelector(".lg").clientWidth,(i||l)&&(o.preventDefault(),t={x:o.targetTouches[0].pageX,y:o.targetTouches[0].pageY})}});for(var s=0;s<e.core.___slide.length;s++)utils.on(e.core.___slide[s],"touchmove.lg",function(a){if(utils.hasClass(e.core.outer,"lg-zoomed")){var s=e.core.___slide[e.core.index].querySelector(".lg-img-wrap"),n,c;a.preventDefault(),r=!0,o={x:a.targetTouches[0].pageX,y:a.targetTouches[0].pageY},utils.addClass(e.core.outer,"lg-zoom-dragging"),c=l?-Math.abs(s.getAttribute("data-y"))+(o.y-t.y):-Math.abs(s.getAttribute("data-y")),n=i?-Math.abs(s.getAttribute("data-x"))+(o.x-t.x):-Math.abs(s.getAttribute("data-x")),(Math.abs(o.x-t.x)>15||Math.abs(o.y-t.y)>15)&&(s.style.left=n+"px",s.style.top=c+"px")}});for(var n=0;n<e.core.___slide.length;n++)utils.on(e.core.___slide[n],"touchend.lg",function(){utils.hasClass(e.core.outer,"lg-zoomed")&&r&&(r=!1,utils.removeClass(e.core.outer,"lg-zoom-dragging"),e.touchendZoom(t,o,i,l))})},o.prototype.zoomDrag=function(){for(var e=this,t={},o={},r=!1,i=!1,l=!1,a=!1,s=0;s<e.core.___slide.length;s++)utils.on(e.core.___slide[s],"mousedown.lgzoom",function(o){var i=e.core.___slide[e.core.index].querySelector(".lg-object");a=i.offsetHeight*i.getAttribute("data-scale")>e.core.outer.querySelector(".lg").clientHeight,l=i.offsetWidth*i.getAttribute("data-scale")>e.core.outer.querySelector(".lg").clientWidth,utils.hasClass(e.core.outer,"lg-zoomed")&&utils.hasClass(o.target,"lg-object")&&(l||a)&&(o.preventDefault(),t={x:o.pageX,y:o.pageY},r=!0,e.core.outer.scrollLeft+=1,e.core.outer.scrollLeft-=1,utils.removeClass(e.core.outer,"lg-grab"),utils.addClass(e.core.outer,"lg-grabbing"))});utils.on(window,"mousemove.lgzoom",function(s){if(r){var n=e.core.___slide[e.core.index].querySelector(".lg-img-wrap"),c,u;i=!0,o={x:s.pageX,y:s.pageY},utils.addClass(e.core.outer,"lg-zoom-dragging"),u=a?-Math.abs(n.getAttribute("data-y"))+(o.y-t.y):-Math.abs(n.getAttribute("data-y")),c=l?-Math.abs(n.getAttribute("data-x"))+(o.x-t.x):-Math.abs(n.getAttribute("data-x")),n.style.left=c+"px",n.style.top=u+"px"}}),utils.on(window,"mouseup.lgzoom",function(s){r&&(r=!1,utils.removeClass(e.core.outer,"lg-zoom-dragging"),!i||t.x===o.x&&t.y===o.y||(o={x:s.pageX,y:s.pageY},e.touchendZoom(t,o,l,a)),i=!1),utils.removeClass(e.core.outer,"lg-grabbing"),utils.addClass(e.core.outer,"lg-grab")})},o.prototype.touchendZoom=function(e,t,o,r){var i=this,l=i.core.___slide[i.core.index].querySelector(".lg-img-wrap"),a=i.core.___slide[i.core.index].querySelector(".lg-object"),s=-Math.abs(l.getAttribute("data-x"))+(t.x-e.x),n=-Math.abs(l.getAttribute("data-y"))+(t.y-e.y),c=(i.core.outer.querySelector(".lg").clientHeight-a.offsetHeight)/2,u=Math.abs(a.offsetHeight*Math.abs(a.getAttribute("data-scale"))-i.core.outer.querySelector(".lg").clientHeight+c),d=(i.core.outer.querySelector(".lg").clientWidth-a.offsetWidth)/2,g=Math.abs(a.offsetWidth*Math.abs(a.getAttribute("data-scale"))-i.core.outer.querySelector(".lg").clientWidth+d);(Math.abs(t.x-e.x)>15||Math.abs(t.y-e.y)>15)&&(r&&(n<=-u?n=-u:n>=-c&&(n=-c)),o&&(s<=-g?s=-g:s>=-d&&(s=-d)),r?l.setAttribute("data-y",Math.abs(n)):n=-Math.abs(l.getAttribute("data-y")),o?l.setAttribute("data-x",Math.abs(s)):s=-Math.abs(l.getAttribute("data-x")),l.style.left=s+"px",l.style.top=n+"px")},o.prototype.destroy=function(){var e=this;utils.off(e.core.el,".lgzoom"),utils.off(window,".lgzoom");for(var t=0;t<e.core.___slide.length;t++)utils.off(e.core.___slide[t],".lgzoom");utils.off(e.core.el,".lgtmzoom"),e.resetZoom(),clearTimeout(e.zoomabletimeout),e.zoomabletimeout=!1},window.lgModules.zoom=o})},{}]},{},[1])(1)});/**!
 * lg-hash.js | 0.0.1 | August 1st 2016
 * http://sachinchoolur.github.io/lg-hash.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t.LgHash=e()}}(function(){var e,t,o;return function e(t,o,i){function n(s,l){if(!o[s]){if(!t[s]){var a="function"==typeof require&&require;if(!l&&a)return a(s,!0);if(r)return r(s,!0);var h=new Error("Cannot find module '"+s+"'");throw h.code="MODULE_NOT_FOUND",h}var f=o[s]={exports:{}};t[s][0].call(f.exports,function(e){var o=t[s][1][e];return n(o?o:e)},f,f.exports,e,t,o,i)}return o[s].exports}for(var r="function"==typeof require&&require,s=0;s<i.length;s++)n(i[s]);return n}({1:[function(t,o,i){!function(t,o){if("function"==typeof e&&e.amd)e([],o);else if("undefined"!=typeof i)o();else{var n={exports:{}};o(),t.lgHash=n.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var i in o)Object.prototype.hasOwnProperty.call(o,i)&&(e[i]=o[i])}return e},t={hash:!0},o=function o(i){return this.el=i,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=e({},t,this.core.s),this.core.s.hash&&(this.oldHash=window.location.hash,this.init()),this};o.prototype.init=function(){var e=this,t;utils.on(e.core.el,"onAfterSlide.lgtm",function(t){window.location.hash="lg="+e.core.s.galleryId+"&slide="+t.detail.index}),utils.on(window,"hashchange.lghash",function(){t=window.location.hash;var o=parseInt(t.split("&slide=")[1],10);t.indexOf("lg="+e.core.s.galleryId)>-1?e.core.slide(o,!1,!1):e.core.lGalleryOn&&e.core.destroy()})},o.prototype.destroy=function(){this.core.s.hash&&(this.oldHash&&this.oldHash.indexOf("lg="+this.core.s.galleryId)<0?window.location.hash=this.oldHash:history.pushState?history.pushState("",document.title,window.location.pathname+window.location.search):window.location.hash="",utils.off(this.core.el,".lghash"))},window.lgModules.hash=o})},{}]},{},[1])(1)});/**!
 * lg-share.js | 0.0.1 | August 1st 2016
 * http://sachinchoolur.github.io/lg-share.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,t.LgShare=e()}}(function(){var e,t,o;return function e(t,o,r){function n(s,l){if(!o[s]){if(!t[s]){var a="function"==typeof require&&require;if(!l&&a)return a(s,!0);if(i)return i(s,!0);var d=new Error("Cannot find module '"+s+"'");throw d.code="MODULE_NOT_FOUND",d}var c=o[s]={exports:{}};t[s][0].call(c.exports,function(e){var o=t[s][1][e];return n(o?o:e)},c,c.exports,e,t,o,r)}return o[s].exports}for(var i="function"==typeof require&&require,s=0;s<r.length;s++)n(r[s]);return n}({1:[function(t,o,r){!function(t,o){if("function"==typeof e&&e.amd)e([],o);else if("undefined"!=typeof r)o();else{var n={exports:{}};o(),t.lgShare=n.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var r in o)Object.prototype.hasOwnProperty.call(o,r)&&(e[r]=o[r])}return e},t={share:!0,facebook:!0,facebookDropdownText:"Facebook",twitter:!0,twitterDropdownText:"Twitter",googlePlus:!0,googlePlusDropdownText:"GooglePlus",pinterest:!0,pinterestDropdownText:"Pinterest"},o=function o(r){return this.el=r,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=e({},t,this.core.s),this.core.s.share&&this.init(),this};o.prototype.init=function(){var e=this,t='<span id="lg-share" class="lg-icon"><ul class="lg-dropdown" style="position: absolute;">';t+=e.core.s.facebook?'<li><a id="lg-share-facebook" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">'+this.core.s.facebookDropdownText+"</span></a></li>":"",t+=e.core.s.twitter?'<li><a id="lg-share-twitter" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">'+this.core.s.twitterDropdownText+"</span></a></li>":"",t+=e.core.s.googlePlus?'<li><a id="lg-share-googleplus" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">'+this.core.s.googlePlusDropdownText+"</span></a></li>":"",t+=e.core.s.pinterest?'<li><a id="lg-share-pinterest" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">'+this.core.s.pinterestDropdownText+"</span></a></li>":"",t+="</ul></span>",this.core.outer.querySelector(".lg-toolbar").insertAdjacentHTML("beforeend",t),this.core.outer.querySelector(".lg").insertAdjacentHTML("beforeend",'<div id="lg-dropdown-overlay"></div>'),utils.on(document.getElementById("lg-share"),"click.lg",function(){utils.hasClass(e.core.outer,"lg-dropdown-active")?utils.removeClass(e.core.outer,"lg-dropdown-active"):utils.addClass(e.core.outer,"lg-dropdown-active")}),utils.on(document.getElementById("lg-dropdown-overlay"),"click.lg",function(){utils.removeClass(e.core.outer,"lg-dropdown-active")}),utils.on(e.core.el,"onAfterSlide.lgtm",function(t){setTimeout(function(){document.getElementById("lg-share-facebook").setAttribute("href","https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(e.core.items[t.detail.index].getAttribute("data-facebook-share-url")||window.location.href)),document.getElementById("lg-share-twitter").setAttribute("href","https://twitter.com/intent/tweet?text="+e.core.items[t.detail.index].getAttribute("data-tweet-text")+"&url="+encodeURIComponent(e.core.items[t.detail.index].getAttribute("data-twitter-share-url")||window.location.href)),document.getElementById("lg-share-googleplus").setAttribute("href","https://plus.google.com/share?url="+encodeURIComponent(e.core.items[t.detail.index].getAttribute("data-googleplus-share-url")||window.location.href)),document.getElementById("lg-share-pinterest").setAttribute("href","http://www.pinterest.com/pin/create/button/?url="+encodeURIComponent(e.core.items[t.detail.index].getAttribute("data-pinterest-share-url")||window.location.href)+"&media="+encodeURIComponent(e.core.items[t.detail.index].getAttribute("href")||e.core.items[t.detail.index].getAttribute("data-src"))+"&description="+e.core.items[t.detail.index].getAttribute("data-pinterest-text"))},100)})},o.prototype.destroy=function(){},window.lgModules.share=o})},{}]},{},[1])(1)});/**!
 * lg-video.js | 0.0.1 | August 1st 2016
 * http://sachinchoolur.github.io/lg-video.js
 * Copyright (c) 2016 Sachin N; 
 * @license Apache 2.0 
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;o="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,o.LgVideo=e()}}(function(){var e,o,i;return function e(o,i,r){function t(s,a){if(!i[s]){if(!o[s]){var d="function"==typeof require&&require;if(!a&&d)return d(s,!0);if(l)return l(s,!0);var c=new Error("Cannot find module '"+s+"'");throw c.code="MODULE_NOT_FOUND",c}var n=i[s]={exports:{}};o[s][0].call(n.exports,function(e){var i=o[s][1][e];return t(i?i:e)},n,n.exports,e,o,i,r)}return i[s].exports}for(var l="function"==typeof require&&require,s=0;s<r.length;s++)t(r[s]);return t}({1:[function(o,i,r){!function(o,i){if("function"==typeof e&&e.amd)e([],i);else if("undefined"!=typeof r)i();else{var t={exports:{}};i(),o.lgVideo=t.exports}}(this,function(){"use strict";var e=Object.assign||function(e){for(var o=1;o<arguments.length;o++){var i=arguments[o];for(var r in i)Object.prototype.hasOwnProperty.call(i,r)&&(e[r]=i[r])}return e},o={videoMaxWidth:"855px",youtubePlayerParams:!1,vimeoPlayerParams:!1,dailymotionPlayerParams:!1,vkPlayerParams:!1,videojs:!1,videojsOptions:{}},i=function i(r){return this.el=r,this.core=window.lgData[this.el.getAttribute("lg-uid")],this.core.s=e({},o,this.core.s),this.videoLoaded=!1,this.init(),this};i.prototype.init=function(){var e=this;utils.on(e.core.el,"hasVideo.lgtm",function(o){if(e.core.___slide[o.detail.index].querySelector(".lg-video").insertAdjacentHTML("beforeend",e.loadVideo(o.detail.src,"lg-object",!0,o.detail.index,o.detail.html)),o.detail.html)if(e.core.s.videojs)try{videojs(e.core.___slide[o.detail.index].querySelector(".lg-html5"),e.core.s.videojsOptions,function(){e.videoLoaded||this.play()})}catch(e){console.error("Make sure you have included videojs")}else e.core.___slide[o.detail.index].querySelector(".lg-html5").play()}),utils.on(e.core.el,"onAferAppendSlide.lgtm",function(o){e.core.___slide[o.detail.index].querySelector(".lg-video-cont")&&(e.core.___slide[o.detail.index].querySelector(".lg-video-cont").style.maxWidth=e.core.s.videoMaxWidth,e.videoLoaded=!0)});var o=function o(i){if(utils.hasClass(i.querySelector(".lg-object"),"lg-has-poster")&&"none"!==i.querySelector(".lg-object").style.display)if(utils.hasClass(i,"lg-has-video")){var r=i.querySelector(".lg-youtube"),t=i.querySelector(".lg-vimeo"),l=i.querySelector(".lg-dailymotion"),s=i.querySelector(".lg-html5");if(r)r.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}',"*");else if(t)try{$f(t).api("play")}catch(e){console.error("Make sure you have included froogaloop2 js")}else if(l)l.contentWindow.postMessage("play","*");else if(s)if(e.core.s.videojs)try{videojs(s).play()}catch(e){console.error("Make sure you have included videojs")}else s.play();utils.addClass(i,"lg-video-playing")}else{utils.addClass(i,"lg-video-playing lg-has-video");var a,d,c=function o(r,t){if(i.querySelector(".lg-video").insertAdjacentHTML("beforeend",e.loadVideo(r,"",!1,e.core.index,t)),t)if(e.core.s.videojs)try{videojs(e.core.___slide[e.core.index].querySelector(".lg-html5"),e.core.s.videojsOptions,function(){this.play()})}catch(e){console.error("Make sure you have included videojs")}else e.core.___slide[e.core.index].querySelector(".lg-html5").play()};e.core.s.dynamic?(a=e.core.s.dynamicEl[e.core.index].src,d=e.core.s.dynamicEl[e.core.index].html,c(a,d)):(a=e.core.items[e.core.index].getAttribute("href")||e.core.items[e.core.index].getAttribute("data-src"),d=e.core.items[e.core.index].getAttribute("data-html"),c(a,d));var n=i.querySelector(".lg-object");i.querySelector(".lg-video").appendChild(n),utils.hasClass(i.querySelector(".lg-video-object"),"lg-html5")||(utils.removeClass(i,"lg-complete"),utils.on(i.querySelector(".lg-video-object"),"load.lg error.lg",function(){utils.addClass(i,"lg-complete")}))}};if(e.core.doCss()&&e.core.items.length>1&&(e.core.s.enableSwipe&&e.core.isTouch||e.core.s.enableDrag&&!e.core.isTouch))utils.on(e.core.el,"onSlideClick.lgtm",function(){var i=e.core.___slide[e.core.index];o(i)});else for(var i=0;i<e.core.___slide.length;i++)!function(i){utils.on(e.core.___slide[i],"click.lg",function(){o(e.core.___slide[i])})}(i);utils.on(e.core.el,"onBeforeSlide.lgtm",function(o){var i=e.core.___slide[o.detail.prevIndex],r=i.querySelector(".lg-youtube"),t=i.querySelector(".lg-vimeo"),l=i.querySelector(".lg-dailymotion"),s=i.querySelector(".lg-vk"),a=i.querySelector(".lg-html5");if(r)r.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}',"*");else if(t)try{$f(t).api("pause")}catch(e){console.error("Make sure you have included froogaloop2 js")}else if(l)l.contentWindow.postMessage("pause","*");else if(a)if(e.core.s.videojs)try{videojs(a).pause()}catch(e){console.error("Make sure you have included videojs")}else a.pause();s&&s.setAttribute("src",s.getAttribute("src").replace("&autoplay","&noplay"));var d;d=e.core.s.dynamic?e.core.s.dynamicEl[o.detail.index].src:e.core.items[o.detail.index].getAttribute("href")||e.core.items[o.detail.index].getAttribute("data-src");var c=e.core.isVideo(d,o.detail.index)||{};(c.youtube||c.vimeo||c.dailymotion||c.vk)&&utils.addClass(e.core.outer,"lg-hide-download")}),utils.on(e.core.el,"onAfterSlide.lgtm",function(o){utils.removeClass(e.core.___slide[o.detail.prevIndex],"lg-video-playing")})},i.prototype.loadVideo=function(e,o,i,r,t){var l="",s=1,a="",d=this.core.isVideo(e,r)||{};if(i&&(s=this.videoLoaded?0:1),d.youtube)a="?wmode=opaque&autoplay="+s+"&enablejsapi=1",this.core.s.youtubePlayerParams&&(a=a+"&"+utils.param(this.core.s.youtubePlayerParams)),l='<iframe class="lg-video-object lg-youtube '+o+'" width="560" height="315" src="//www.youtube.com/embed/'+d.youtube[1]+a+'" frameborder="0" allowfullscreen></iframe>';else if(d.vimeo)a="?autoplay="+s+"&api=1",this.core.s.vimeoPlayerParams&&(a=a+"&"+utils.param(this.core.s.vimeoPlayerParams)),l='<iframe class="lg-video-object lg-vimeo '+o+'" width="560" height="315"  src="//player.vimeo.com/video/'+d.vimeo[1]+a+'" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';else if(d.dailymotion)a="?wmode=opaque&autoplay="+s+"&api=postMessage",this.core.s.dailymotionPlayerParams&&(a=a+"&"+utils.param(this.core.s.dailymotionPlayerParams)),l='<iframe class="lg-video-object lg-dailymotion '+o+'" width="560" height="315" src="//www.dailymotion.com/embed/video/'+d.dailymotion[1]+a+'" frameborder="0" allowfullscreen></iframe>';else if(d.html5){var c=t.substring(0,1);"."!==c&&"#"!==c||(t=document.querySelector(t).innerHTML),l=t}else d.vk&&(a="&autoplay="+s,this.core.s.vkPlayerParams&&(a=a+"&"+utils.param(this.core.s.vkPlayerParams)),l='<iframe class="lg-video-object lg-vk '+o+'" width="560" height="315" src="http://vk.com/video_ext.php?'+d.vk[1]+a+'" frameborder="0" allowfullscreen></iframe>');return l},i.prototype.destroy=function(){this.videoLoaded=!1},window.lgModules.video=i})},{}]},{},[1])(1)});(function ($) {
    // To top button
    $("#back-to-top").on('click', function () {
        $('body, html').animate({ scrollTop: 0 }, 600);
    });

    // Nav bar toggle
    $('#main-nav-toggle').on('click', function () {
        $('.nav-container-inner').slideToggle();
    });

    // Caption
    $('.article-entry').each(function(i) {
        $(this).find('img').each(function() {
            if (this.alt && !(!!$.prototype.justifiedGallery && $(this).parent('.justified-gallery').length)) {
                $(this).after('<span class="caption">' + this.alt + '</span>');
            }

            // 对于已经包含在链接内的图片不适用lightGallery
            if ($(this).parent().prop("tagName") !== 'A') {
                $(this).wrap('<a href="' + this.src + '" title="' + this.alt + '" class="gallery-item"></a>');
            }
        });

    });
    if (typeof lightGallery != 'undefined') {
        var options = {
            selector: '.gallery-item',
        };
        $('.article-entry').each(function(i, entry) {
            lightGallery(entry, options);
        });
        lightGallery($('.article-gallery')[0], options);
    }
    if (!!$.prototype.justifiedGallery) {  // if justifiedGallery method is defined
        var options = {
            rowHeight: 140,
            margins: 4,
            lastRow: 'justify'
        };
        $('.justified-gallery').justifiedGallery(options);
    }

    // Sidebar expend
    $('#sidebar .sidebar-toggle').on('click', function () {
        if($('#sidebar').hasClass('expend')) {
            $('#sidebar').removeClass('expend');
        } else {
            $('#sidebar').addClass('expend');
        }
    });


    // Remove extra main nav wrap
    $('.main-nav-list > li').unwrap();

    // Highlight current nav item
    $('#main-nav > li > .main-nav-list-link').each(function () {
        if($('.page-title-link').length > 0){
            if ($(this).html().toUpperCase() == $('.page-title-link').html().toUpperCase()) {
                $(this).addClass('current');
            } else if ($(this).attr('href') == $('.page-title-link').attr('data-url')) {
                $(this).addClass('current');
            }
        }
    });

    // Auto hide main nav menus
    function autoHideMenus(){
        var max_width = $('.nav-container-inner').width() - 10;
        var main_nav_width = $('#main-nav').width();
        var sub_nav_width = $('#sub-nav').width();
        if (main_nav_width + sub_nav_width > max_width) {
            // If more link not exists
            if ($('.main-nav-more').length == 0) {
                $(['<li class="main-nav-list-item top-level-menu main-nav-more">',
                    '<a class="main-nav-list-link" href="javascript:;">More</a>',
                    '<ul class="main-nav-list-child">',
                    '</ul></li>'].join('')).appendTo($('#main-nav'));
                // Bind hover event
                $('.main-nav-more').hover(function () {
                    if($(window).width() < 480) {
                        return;
                    }
                    $(this).children('.main-nav-list-child').slideDown('fast');
                }, function () {
                    if($(window).width() < 480) {
                        return;
                    }
                    $(this).children('.main-nav-list-child').slideUp('fast');
                });
            }
            var child_count = $('#main-nav').children().length;
            for (var i = child_count - 2; i >= 0; i--) {
                var element = $('#main-nav').children().eq(i);
                if (main_nav_width + sub_nav_width > max_width) {
                    element.prependTo($('.main-nav-more > ul'));
                    main_nav_width = $('#main-nav').width();
                } else {
                    return;
                }
            }
        }
        // Nav bar is wide enough
        if ($('.main-nav-more').length > 0) {
            $('.main-nav-more > ul').children().appendTo($('#main-nav'));
            $('.main-nav-more').remove();
        }
    }
    autoHideMenus();

    $(window).on('resize', function () {
        autoHideMenus();
    });

    // Fold second-level menu
    $('.main-nav-list-item').hover(function () {
        if ($(window).width() < 480) {
            return;
        }
        $(this).children('.main-nav-list-child').slideDown('fast');
    }, function () {
        if ($(window).width() < 480) {
            return;
        }
        $(this).children('.main-nav-list-child').slideUp('fast');
    });

    // Add second-level menu mark
    $('.main-nav-list-item').each(function () {
        if ($(this).find('.main-nav-list-child').length > 0) {
            $(this).addClass('top-level-menu');
        }
    });

})(jQuery);
