// ==UserScript==
// @name	[Pr0] Visitenkarte
// @author	rebrain
// @namespace	rebrain
// @copyright	2015
// @description	Erzeugt eine Visitenkarte bei der Anzeige von Benutzernamen
// @version	1.0.0
// @grant	none
// @include	*pr0gramm.com*
// @icon	http://pr0gramm.com/media/pr0gramm-favicon.png
// @updateURL	https://raw.githubusercontent.com/rebrainding/pr0/master/QuickProfile.js
// @downloadURL	https://raw.githubusercontent.com/rebrainding/pr0/master/QuickProfile.js
// ==/UserScript==

// Global vars
var cacheName = 'profileCache';
var previousProfile = null;

// Modify template before rendering
modifyTemplate();

// Do css stuff
$(document).ready(function() {
    // Build cache
    createProfileCache();
    
    // CSS code
    var css = '.wide-button { padding-top: 5px; padding-bottom: 5px; padding-left: 20px; padding-right: 20px; margin-top: 5px; margin-bottom: 5px; } \
.user.profile { display: inline; } \
.user.profile > .name { cursor: pointer; } \
.user.profile > .extended { z-index: 9000; display: none; font-size: 12px; position: absolute; margin-top: 5px; min-width: 250px; padding: 5px; padding-top: 10px; background-color: rgba(0, 0, 0, 0.8); /*border: 1px solid rgb(42, 46, 49);*/ } \
.user.profile > .extended.loading { display: none; }  \
.user.profile > .extended > .data-row { display: inline; font-family: sans-serif; } \
.user.profile > .extended > .data-row:after { clear: both; display: block; content: " "; padding-bottom: 3px; } \
.user.profile > .extended > .data-row > .left { padding-right: 10px; color: #BBBBBB; float: left; } \
.user.profile > .extended > .data-row > .right { padding-left: 10px; float: right; } \
.user.profile > .extended > .data-row > .right.fliese { color: #F5F7F6; } \
.user.profile > .extended > .data-row > .right.rebrain { color: #EE4D2E; } \
.comments > .comment-box:last-child { margin-bottom: 105px; } \
';
    
    // Now bind action to item and comment
    $(document).on('click', 'div.user.profile[data-showable][data-visible]', function() { handleUserProfile(this); });
    
    // CSS stuff
    $('head').append('<style type="text/css">' + css + '</style>');
    
});

function modifyTemplate() {
    // Modify stream template (item and comment)
    refreshTemplate(p.View.Stream.Item, 'item.user', 'item.mark');
    refreshTemplate(p.View.Stream.Comments, 'c.name', 'c.mark');
    
    // Modify stelz template
    refreshTemplate(p.View.FollowList, 'followed.name', 'followed.mark');
    
    // Modify inbox template (thread, sender and comment)
    refreshTemplate(p.View.Inbox, 't.partner.name', 't.partner.mark');
    refreshTemplate(p.View.Inbox, 'm.senderName', 'm.senderMark');
    refreshTemplate(p.View.Inbox, 'm.name', 'm.mark');
}

function refreshTemplate(view, name, mark) {
    // Build regex and profile
    var regex = buildProfileRegex(name, mark);
    var update= buildProfileTemplate(name, mark);
    
    // Replace in template
    view.prototype.template = view.prototype.template.replace(regex, update);
}

function buildProfileRegex(name, mark) {
    return (new RegExp('<a href="#user/{' + name + '}" class="user um{' + mark + '}">{' + name + '}</a>', 'g'));
}

function buildProfileTemplate(name, mark) {
    return '<div class="user profile um{' + mark + '}" data-showable="0" data-visible="0"><span class="name">{' + name + '}</span>\
<div class="extended" data-user="{' + name + '}"><div class="data-row"><span class="left"><a href="#user/{' + name + '}" class="confirm-button wide-button">zum Profil</a></span>\
<span class="right"><a href="#user/{' + name + '}/uploads" class="confirm-button wide-button">alle Uploads</a></span></div></div></div>';
}

function createProfileCache() {
    $('body').append('<div id="' + cacheName + '" hidden="hidden"></div>');
}

function isProfileCached(user) {
    return ($('body > div#' + cacheName + ' > div[data-user="' + user + '"]').length > 0);
}

function addProfileInCache(user, rank, score, registration, bann, badges) {
    var content = '<div data-type="cache" data-user="' + user + '">';
    
    // Handle color
    if (score > 0) {
        var color = 'rebrain';
    } else {
        var color = 'fliese';
    }
    
    // Rank and Score
    //rank = '<span class="user um' + rank + '">' + p.User.MARK[rank] + '</span>';
    content = content + createCacheLine('Status', rank, color);
    content = content + createCacheLine('Benis', score, color);
    
    // Registration
    if (score < 0) {
        content = content + createCacheLine('geschrumpft seit', registration, color);
    } else {
        content = content + createCacheLine('gewachsen seit', registration, color);
    }
    
    // Bann
    if (bann != '') {
        content = content + createCacheLine('gesperrt f&uuml;r', bann, color);
    }
    
    // Badges
    if (badges != '') {
        content = content + createCacheLine('', badges, color);
    }
    
    // Profile link
    content = content + '</div>';
    
    // Provide in cache
    $('body > div#' + cacheName).append(content);
}

function createCacheLine(left, right, color) {
    return '<div class="data-row"><span class="left">' + left + '</span><span class="right ' + color + '">' + right + '</span></div>';
}

function loadProfileFromCache(user, target) {
    // Try to load from cache
    var cache = $('body > div#' + cacheName + ' > div[data-type="cache"][data-user="' + user + '"]');
    if (cache.length > 0) {
        target.children('div.extended').children('div:first-child').before(cache.html());
    }
    
    // If we could not load it from cache: we just show a link to full profile 
}

function loadProfileFromAPI(user) {
    // Build api url
    var profileAPI = '/api/profile/info?name=' + user;
    
    // AJAX request
    $.ajax({
        url: profileAPI,
        async: false,
        beforeSend: function() {
            $(document).css('cursor', 'progress');
        },
        complete: function() {
            $(document).css('cursor', undefined);
        },
        success: function(data) {
            // Handle data
            data = jQuery.parseJSON(data);
            var user = data.user;
            var badges = data.badges;
            
            // Rank
            var rank = p.User.MARK[user.mark];
            //var rank = user.mark;
            
            // Score and registration
            var score = user.score;
            var since = (new Date (user.registered * 1000)).relativeTime(true, true);
            
            // Bann
            var banned = '';
            if (user.banned) {
                if (user.bannedUntil == null) {
                    banned = 'immer';
                } else {
                    banned = new Date(user.bannedUntil * 1000);
                    banned = banned.relativeTime(false, true);
                }
            }
            
            // Static comment badge
            for (var i = 0; i < p.View.User.BADGE.COMMENTS.COUNTS.length; i++) {
                if (data.commentCount > p.View.User.BADGE.COMMENTS.COUNTS[i].count) {
                    var specialBadge = p.copy(p.View.User.BADGE.COMMENTS.TEMPLATE);
                    specialBadge.description = specialBadge.description.replace(/%c/g, p.View.User.BADGE.COMMENTS.COUNTS[i].count);
                    specialBadge.link = '#user/' + data.user.name + '/comments/before/' + (data.comments.length ? data.comments.first().created + 1 : 0);
                    specialBadge.extra = p.View.User.BADGE.COMMENTS.COUNTS[i].name;
                    specialBadge.css = 'comments';
                    
                    data.badges.push(specialBadge);
                }
            }
            
            // Static year badge
            var years = Math.floor((Date.now() - data.user.registered * 1000) / (365 * 24 * 60 * 60 * 1000));
            if (years > 0) {
                var specialBadge = p.copy(p.View.User.BADGE.YEARS.TEMPLATE);
                specialBadge.description = specialBadge.description.replace(/%y/g, 'Jahr'.inflect(years));
                specialBadge.link = '#user/' + data.user.name;
                specialBadge.extra = years.toString();
                specialBadge.css = 'years';
                
                data.badges.push(specialBadge);
            }
            
            // Badges
            var badge = '';
            for (var i = 0; i < badges.length; i++) {
                badge = badge + ' <a class="badge" href="http://' + CONFIG.HOST + '/' + badges[i].link.substr(1) + '" title="' + badges[i].description + '"><img src="/media/badges/' + badges[i].image + '" class="badge" alt="" />' + (badges[i].extra != undefined ? '<span class="badge-extra' + (badges[i].css != undefined ? ' badge-' + badges[i].css : '') + '">' + badges[i].extra + '</span>' : '') + '</a>';
            }
            badge = badge.trim();
            
            // Provide to cache
            addProfileInCache(user.name, rank, score, since, banned, badge);
        }
    });
}

function handleUserProfile(element, call) {
    // Get node
    element = $('body').find(element);
    
    if (call == undefined) {
        call = 1;
    }
    
    if (call > 2) {
        return;
    }
    
    // Hide item
    if (element.attr('data-visible') == 1) {
        // Close physically
        previousProfile = null;
        
        // Close visually
        element.children('div.extended').hide('slow');
        element.attr('data-visible', '0');
        
    // Show item
    } else {
        // Close previous profile
        if (previousProfile != null) {
            handleUserProfile(previousProfile, call + 1);
        }
        
        // Load item
        if (element.attr('data-showable') != 1) {
            // Get username
            var user = element.children('div.extended').attr('data-user');
            
            // Load from api if required
            if (!isProfileCached(user)) {
                loadProfileFromAPI(user);
            }
            
            // Load from local cache
            loadProfileFromCache(user, element);
            element.attr('data-showable', '1');
        }
        
        // Mark current as visible
        previousProfile = element;
        
        // Now we are able to show
        element.children('div.extended').show('slow').css('display', 'inline');
        element.attr('data-visible', '1');
    }
}
