// ==UserScript==
// @name	[Pr0] Visitenkarte
// @author	rebrain
// @namespace	rebrain
// @copyright	2015
// @description	Erzeugt eine Visitenkarte bei der Anzeige von Benutzernamen
// @version	1.2.0
// @grant	none
// @include	*pr0gramm.com*
// @icon	http://pr0gramm.com/media/pr0gramm-favicon.png
// @updateURL	https://raw.githubusercontent.com/rebrainding/pr0/master/QuickProfile.js
// @downloadURL	https://raw.githubusercontent.com/rebrainding/pr0/master/QuickProfile.js
// ==/UserScript==

// HIER KANNST DU EINSTELLUNGEN VORNEHMEN UND DAS SKRIPT
// DEINEN WÜNSCHEN ANPASSEN, BEACHTE DIE ANMERKUNGEN!

// Geschwindigkeit mit der sich die Visitenkarte öffnet (erlaubte Werte: "fast", "normal", "slow")
var profileAnimationSpeed = 'fast';

// Dauer die das Profil mindestens angezeigt wird, sofern es geöffnet wurde (Wert in Millisekunden)
var profileMinShowDuration = 800;

// Sollen Fehler anzeigt (Wert: true) werden oder unterdrückt (Wert: false) (erlaubte Werte: "true" oder "false")
var displayError = true;


// AB HIER LÄSST DU BESSER DEINE PFOTEN VOM SKRIPT ...
// ... AUSSER DU HAST AHNUNG WAS DU DA MACHST

// Global special config
var cacheName = 'profileCache';
var profileOpenDelay = 75;

// Global vars
var activeProfile = null;
var user = undefined;

// Modify template before rendering
modifyTemplates();

// Do css stuff
$(document).ready(function() {
    // Start user data loading
    getOwnUserData();
    
    // Build cache
    createProfileCache();
    
    // CSS code
    var css = '.profile-button { margin-left: 5px; margin-right: 5px; padding-top: 5px; padding-bottom: 5px; padding-left: 20px; padding-right: 20px; margin-top: 5px; margin-bottom: 5px; } \
.profile-button[data-action="follow"][data-follow-state="1"] { background-color: #555555; } \
.profile-button[data-action="follow"][data-follow-state="1"]:hover { background-color: #F5F7F6; } \
.user.profile { display: inline; } \
.user.profile > .name { cursor: pointer; } \
.user.profile > .name.active { text-decoration: underline; } \
.user.profile > .extended { z-index: 9000; display: none; font-size: 12px; position: absolute; margin-top: 5px; min-width: 250px; padding: 5px; padding-top: 10px; background-color: rgba(0, 0, 0, 0.8); /*border: 1px solid rgb(42, 46, 49);*/ } \
.user.profile > .extended > .data-row { display: inline; font-family: sans-serif; text-align: center; } \
.user.profile > .extended > .data-row:after { clear: both; display: block; content: " "; padding-bottom: 3px; } \
.user.profile > .extended > .data-row > .full { text-align: center; } \
.user.profile > .extended > .data-row > .left { padding-right: 10px; color: #BBBBBB; float: left; } \
.user.profile > .extended > .data-row > .right { padding-left: 10px; float: right; } \
.user.profile > .extended > .data-row > .right.exceptional { color: #F5F7F6; } \
.user.profile > .extended > .data-row > .right.default { color: #EE4D2E; } \
.comments > .comment-box:last-child { margin-bottom: 105px; } \
';
    
    // Now bind action to item and comment
    $(document).on('click', 'div.user.profile[data-showable][data-visible] > span.name', function() { p.navigateTo('user/' + this.innerHTML, p.NAVIGATE.DEFAULT); });
    $(document).on('mouseover', 'div.user.profile[data-showable][data-visible]', function() { handleUserHoverProfile(this, 'request') });
    $(document).on('mouseout', 'div.user.profile[data-showable][data-visible]', function() { handleUserHoverProfile(this, 'close') });
    
    // Then bind follow action
    $(document).on('click', 'a.confirm-button.profile-button[data-action="follow"]', function() { followUser(this); });
    
    // CSS stuff
    $('head').append('<style type="text/css">' + css + '</style>');
    
});

function getOwnUserData() {
    // Get user info
    p.api.get('user.info', {}, function(response) {
        user = response.account;
        console.log(hasPr0mium());
    }, p.ServerAPI.SILENT);
}

function hasPr0mium() {
    return (user != undefined && (user.paidUntil * 1000) > (Date.now()));
}

function modifyTemplates() {
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
<div class="extended" data-user="{' + name + '}"><div class="data-row"><span class="full">\
<a href="#user/{' + name + '}" class="confirm-button profile-button"><span class="pict"></span>Profil</a>\
<a href="#user/{' + name + '}/uploads" class="confirm-button profile-button"><span class="pict"></span>Uploads</a>\
<a class="confirm-button profile-button" data-user="{' + name + '}" data-action="follow" data-follow-state="0"><span class="pict">@</span> <span class="description">stelz</span></a>\
</span></div></div></div>';
}

function createProfileCache() {
    $('body').append('<div id="' + cacheName + '" hidden="hidden"></div>');
}

function isProfileCached(user) {
    return ($('body > div#' + cacheName + ' > div[data-user="' + user + '"]').length > 0);
}

function changeFollowState(user, newState) {
    // Change all buttons
    $(document).find('a[data-action="follow"][data-user="' + user + '"]').each(function() {
        // Change attribute and text
        $(this).attr('data-follow-state', (newState ? '1' : '0'));
        $(this).children('span.description').text((newState ? 'unstelz' : 'stelz'));
    });
}

function followUser(button) {
    // Handle login
    if (!p.mainView.requireLogin()) {
        return false;
    }
    
    // Handle pr0mium
    if (!hasPr0mium()) {
        p.navigateTo('pr0mium', p.NAVIGATE.DEFAULT);
    }
    
    // Get real button and handle follow action
    button = $('body').find(button);
    var state = button.attr('data-follow-state') == '1';
    var action = (state ? 'un' : '') + 'follow';
    var user = button.attr('data-user');
    
    // Now talk to api
    p.api.post('profile.' + action, {
        name: user
    }, (displayError ? function() { console.log('Fehler beim stelzen'); } : p.ServerAPI.SILENT));
    
    // Then display change and return
    changeFollowState(user, !state);
    return true;
}

function addProfileInCache(user, data, badges) {
    // Prepare final output
    var content = '<div data-type="cache" data-user="' + user + '">';
    
    // Handle data
    for (var i = 0; i < data.length; i++) {
        content = content + createCacheLine(data[i].name, data[i].value, 'default');
    }
    
    // Handle badges
    var renderedBadges = '';
    for (var i = 0; i < badges.length; i++) {
        renderedBadges = renderedBadges + ' <a class="badge" href="http://' + CONFIG.HOST + '/' + badges[i].link.substr(1) + '" title="' + badges[i].description + '"><img src="/media/badges/' + badges[i].image + '" class="badge" alt="" />' + (badges[i].extra != undefined ? '<span class="badge-extra' + (badges[i].css != undefined ? ' badge-' + badges[i].css : '') + '">' + badges[i].extra + '</span>' : '') + '</a>';
    }
    content = content + createCacheLine('', renderedBadges, 'default');
    
    // Finish final line
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
        target.attr('data-showable', '1');
    }
}

function handleLoadedData(data, node) {
    // Handle data
    var profile = [];
    var user = data.user;
    var badges = data.badges;
    
    // Rank
    if (user.mark != 4) {
        profile.push({
            name: 'Status',
            value: p.User.MARK[user.mark]
        });
    }
    
    // Score and registration
    profile.push({
        name: 'Benis',
        value: user.score
    }, {
        name: (user.score > 0 ? 'gewachsen seit' : 'geschrumpft seit'),
        value: (new Date (user.registered * 1000)).relativeTime(true, true)
    });
    
    // Bann
    if (user.banned) {
        // Handle duration
        var duration = '';
        if (user.bannedUntil == null) {
            duration = 'immer';
        } else {
            duration = new Date(user.bannedUntil * 1000);
            duration = duration.relativeTime(false, true);
        }
        
        // Add to profile
        profile.push({
            name: 'gesperrt f&uuml;r',
            value: duration
        });
    }
    
    // Static comment badge
    for (var i = 0; i < p.View.User.BADGE.COMMENTS.COUNTS.length; i++) {
        if (data.commentCount > p.View.User.BADGE.COMMENTS.COUNTS[i].count) {
            var badge = p.copy(p.View.User.BADGE.COMMENTS.TEMPLATE);
            badge.description = badge.description.replace(/%c/g, p.View.User.BADGE.COMMENTS.COUNTS[i].count);
            badge.link = '#user/' + data.user.name + '/comments/before/' + (data.comments.length ? data.comments.first().created + 1 : 0);
            badge.extra = p.View.User.BADGE.COMMENTS.COUNTS[i].name;
            badge.css = 'comments';
            
            data.badges.push(badge);
        }
    }
    
    // Static year badge
    var years = Math.floor((Date.now() - data.user.registered * 1000) / (365 * 24 * 60 * 60 * 1000));
    if (years > 0) {
        var badge = p.copy(p.View.User.BADGE.YEARS.TEMPLATE);
        badge.description = badge.description.replace(/%y/g, 'Jahr'.inflect(years));
        badge.link = '#user/' + data.user.name;
        badge.extra = years.toString();
        badge.css = 'years';
        
        data.badges.push(badge);
    }
    
    // Handle stelz button
    if (data.following && hasPr0mium()) {
        changeFollowState(user.name, true);
    }
    
    // Remove loading animation
    node.children('div.extended').children('div.loader').remove();
    node.children('div.extended').children('div:first-child').css('display', '');
    
    // Provide to cache and then use
    addProfileInCache(user.name, profile, data.badges);
    loadProfileFromCache(user.name, node);
}

function loadProfileFromAPI(user, node) {
    // Just do one api request
    if (node.attr('data-request-done') != undefined) {
        return;
    }
    
    // Mark as done
    node.attr('data-request-done', '1');
    
    // Add loading animation
    node.children('div.extended').children('div:first-child').css('display', 'none');
    node.children('div.extended').append(p.View.Base.LoadingAnimHTML);
    node.children('div.extended').children('div.loader').css('margin-top', '32px');
    
    // Start ajax request
    p.api.get('profile.info', {
        name: user
    }, function(response) {
        handleLoadedData(response, node);
    }, (displayError ? function() { console.log('Fehler beim stelzen'); } : p.ServerAPI.SILENT));
}

function handleUserHoverProfile(element, action, force) {
    // Mouse hovered profile link
    if (action == 'request') {
        // Get html node and control existance
        element = $('body').find(element);
        if (!element.length) {
            return;
        }
        
        // Set pointer
        activeProfile = element;
        
        // Show that we will open it
        element.children('span.name').addClass('active');
        
        // Start open timer
        setTimeout(function() { handleUserHoverProfile(element, 'open') }, profileOpenDelay);
        
    // Control if mouse still over profile
    } else if (action === 'open') {
        // Just open if mouse still over and node exists
        if (element != activeProfile || !element.length) {
            return;
        }
        
        // Get open profile and close it
        var openProfile = $('div.user.profile[data-showable][data-visible=1]');
        if (openProfile.children('span.name').text() != element.children('span.name').text()) {
            handleUserHoverProfile(openProfile, 'timeout', true);
        }
        
        // Show visually and physically
        element.children('div.extended').show(profileAnimationSpeed);
        element.attr('data-visible', '1');
        
        // Load item data
        if (element.attr('data-showable') != 1) {
            // Get username
            var user = element.children('div.extended').attr('data-user');
            
            // Load from api
            if (!isProfileCached(user)) {
                loadProfileFromAPI(user, element);
            
            // Load from local cache
            } else {
                loadProfileFromCache(user, element);
            }
        }
        
    // Mouse left profile link / data
    } else if (action === 'close') {
        // Delete link to active profile
        activeProfile = null;
        
        // Set mouse leave timeout
        setTimeout(function() { handleUserHoverProfile(element, 'timeout') }, profileMinShowDuration);
        
    // Profile will be closed cause no active view
    } else if (action === 'timeout') {
        // Get html node
        element = $('body').find(element);
        
        // Control node existance
        if (!element.length) {
            return;
        }
        
        // Just close if not still open
        if ((activeProfile == null && activeProfile != element) || force == true) {
            // Close physically ...
            element.attr('data-visible', '0');
            
            // ... then visually
            element.children('span.name').removeClass('active');
            element.children('div.extended').hide(profileAnimationSpeed);
        }
    }
}
