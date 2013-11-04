function is_reader_mode() {
	var stream = $("#stream.reader");
	return stream.html() != null;
}

function is_normal_mode() {
	var stream = $("#stream.normal");
	return stream.html() != null;
}

function is_global_mode() {
	var stream = $("#stream.global");
	return stream.html() != null;
}

function redirect (url, new_tab) {
	if (url) {
		if (new_tab) {
			window.open (url);
		} else {
			location.href = url;
		}
	}
}

function toggleContent (new_active, old_active) {
	if (does_lazyload) {
		new_active.find('img[data-original]').each(function() {
			this.setAttribute('src', this.getAttribute('data-original'));
			this.removeAttribute('data-original');
		});
	}

	old_active.removeClass ("active");
	if (old_active[0] != new_active[0]) {
		new_active.addClass ("active");
	}

	var box_to_move = "html,body";
	var relative_move = false;
	if (is_global_mode()) {
		box_to_move = "#panel";
		relative_move = true;
	}

	var new_pos = new_active.position ().top,
		old_scroll = $(box_to_move).scrollTop (),
		new_scroll = old_scroll;
	if (hide_posts) {
		old_active.children (".flux_content").toggle (0);

		new_pos = new_active.position ().top;
		old_scroll = $(box_to_move).scrollTop ();

		if (relative_move) {
			new_pos += old_scroll;
		}

		if (old_active[0] != new_active[0]) {
			new_active.children (".flux_content").toggle (0, function () {
				new_scroll = $(box_to_move).scrollTop (new_pos).scrollTop ();
			});
		}
	} else {
		if (relative_move) {
			new_pos += old_scroll;
		}

		new_scroll = $(box_to_move).scrollTop (new_pos).scrollTop ();
	}

	if (auto_mark_article) {
		mark_read(new_active, true);
	}
}

function _incLabel(p, inc) {
	var i = (parseInt(p.replace(/\D/g, '')) || 0) + inc;
	return i > 0 ? ' (' + i + ')' : '';
}

function mark_read (active, only_not_read) {
	if (active[0] === undefined || (
		only_not_read === true && !active.hasClass("not_read"))) {
		return false;
	}

	url = active.find ("a.read").attr ("href");
	if (url === undefined) {
		return false;
	}

	$.ajax ({
		type: 'POST',
		url: url,
		data : { ajax: true }
	}).done (function (data) {
		res = jQuery.parseJSON(data);

		active.find ("a.read").attr ("href", res.url);

		var inc = 0;
		if (active.hasClass ("not_read")) {
			active.removeClass ("not_read");
			inc--;
		} else if (only_not_read !== true || active.hasClass("not_read")) {
			active.addClass ("not_read");
			inc++;
		}

		//Update unread: feed	//Alex
		var feed_url = active.find(".website>a").attr("href"),
			feed_id = feed_url.substr(feed_url.lastIndexOf('f_')),
			elem = $('#' + feed_id + ' .feed').get(0),
			attr_unread = elem ? elem.getAttributeNode('data-unread') : null,
			feed_priority = elem ? parseInt(elem.getAttribute('data-priority')) : 0;
		if (attr_unread)
			attr_unread.value = Math.max(0, parseInt(attr_unread.value) + inc);

		//Update unread: category
		elem = $('#' + feed_id).parent().prevAll('.category').children(':first').get(0);
		attr_unread = elem ? elem.getAttributeNode('data-unread') : null;
		if (attr_unread)
			attr_unread.value = Math.max(0, parseInt(attr_unread.value) + inc);

		if (feed_priority > 0) {	//Update unread: all
			elem = $('#aside_flux .all').children(':first').get(0);
			attr_unread = elem ? elem.getAttributeNode('data-unread') : null;
			if (attr_unread)
				attr_unread.value = Math.max(0, parseInt(attr_unread.value) + inc);
		}

		//Update unread: title
		document.title = document.title.replace(/((?: \(\d+\))?)( - .*?)((?: \(\d+\))?)$/, function(m, p1, p2, p3) {
			return _incLabel(p1, inc) + p2 + _incLabel(p3, feed_priority > 0 ? inc : 0);
		});
	});
}

function mark_favorite (active) {
	if (active[0] === undefined) {
		return false;
	}

	url = active.find ("a.bookmark").attr ("href");
	if (url === undefined) {
		return false;
	}

	$.ajax ({
		type: 'POST',
		url: url,
		data : { ajax: true }
	}).done (function (data) {
		res = jQuery.parseJSON(data);

		active.find ("a.bookmark").attr ("href", res.url);
		var inc = 0;
		if (active.hasClass ("favorite")) {
			active.removeClass ("favorite");
			inc--;
		} else {
			active.addClass ("favorite");
			inc++;
		}

		var favourites = $('.favorites>a').contents().last().get(0);
		if (favourites && favourites.textContent)
			favourites.textContent = favourites.textContent.replace(/((?: \(\d+\))?\s*)$/, function(m, p1) {
				return _incLabel(p1, inc);
			});
	});
}

function prev_entry() {
	old_active = $(".flux.active");
	last_active = $(".flux:last");
	new_active = old_active.prevAll (".flux:first");

	if (new_active.hasClass("flux")) {
		toggleContent (new_active, old_active);
	} else if (old_active[0] === undefined &&
		new_active[0] === undefined) {
		toggleContent (last_active, old_active);
	}
}

function next_entry() {
	old_active = $(".flux.active");
	first_active = $(".flux:first");
	last_active = $(".flux:last");
	new_active = old_active.nextAll (".flux:first");

	if (new_active.hasClass("flux")) {
		toggleContent (new_active, old_active);
	} else if (old_active[0] === undefined &&
		new_active[0] === undefined) {
		toggleContent (first_active, old_active);
	}

	if ((!auto_load_more) && (last_active.attr("id") === new_active.attr("id"))) {
		load_more_posts ();
	}
}

function init_img () {
	var maxWidth = $(".flux_content .content").width() / 2;
	$(".flux_content .content img").each (function () {
		if ($(this).width () > maxWidth) {
			$(this).addClass("big");
		}
	});
}

function inMarkViewport(flux, box_to_follow, relative_follow) {
	var top = flux.position().top;
	if (relative_follow) {
		top += box_to_follow.scrollTop();
	}
	var height = flux.height();
	var begin = top + 3 * height / 4;
	var bot = Math.min(begin + 75, top + height);

	var windowTop = box_to_follow.scrollTop();
	var windowBot = windowTop + box_to_follow.height() / 2;

	return (windowBot >= begin && bot >= windowBot);
}

function init_posts () {
	init_img ();
	if ($.fn.lazyload) {
		if (is_global_mode()) {
			$(".flux .content img").lazyload({
				container: $("#panel")
			});
		} else {
			$(".flux .content img").lazyload();
		}
	}

	if (hide_posts) {
		$(".flux:not(.active) .flux_content").hide ();
	}

	var box_to_follow = $(window);
	var relative_follow = false;
	if (is_global_mode()) {
		box_to_follow = $("#panel");
		relative_follow = true;
	}

	if (auto_mark_scroll) {
		box_to_follow.scroll(function() {
			$('.flux.not_read:visible').each(function() {
				if ($(this).children(".flux_content").is(':visible') &&
					inMarkViewport($(this), box_to_follow, relative_follow)) {
					mark_read($(this), true);
				}
			});
		});
	}

	if (auto_load_more) {
		box_to_follow.scroll(function() {
			var load_more = $("#load_more");
			if (!load_more.is(':visible')) return;
			var boxBot = box_to_follow.scrollTop() + box_to_follow.height();
			var load_more_top = load_more.position().top;
			if (relative_follow) {
				load_more_top += box_to_follow.scrollTop();
			}
			if (boxBot >= load_more_top) {
				load_more_posts ();
			}
		});
	}
}

function init_column_categories () {
	if (!is_normal_mode()) {
		return;
	}

	//TODO: toggle class in PHP and remove the CSS changes done in JavaScript
	$(".category:not(.all):not(.favorites) .btn:first-child").width ("160px");
	$(".category:not(.all):not(.favorites)").addClass("stick").
		append ("<a class=\"btn dropdown-toggle\" href=\"#\"><i class=\"icon i_down\"></i></a>");

	$(".category + .feeds").not(".active").hide();
	$(".category.active a.dropdown-toggle i").toggleClass ("i_up");

	$(".category a.dropdown-toggle").click (function () {
		$(this).children ().toggleClass ("i_up");
		$(this).parent ().next (".feeds").slideToggle();
		return false;
	});
}

function init_shortcuts () {
	// Touches de manipulation
	shortcut.add(shortcuts['mark_read'], function () {
		// on marque comme lu ou non lu
		active = $(".flux.active");
		mark_read (active, false);
	}, {
		'disable_in_input':true
	});
	shortcut.add("shift+"+shortcuts['mark_read'], function () {
		// on marque tout comme lu
		url = $(".nav_menu a.read_all").attr ("href");
		redirect (url, false);
	}, {
		'disable_in_input':true
	});
	shortcut.add(shortcuts['mark_favorite'], function () {
		// on marque comme favori ou non favori
		active = $(".flux.active");
		mark_favorite (active);
	}, {
		'disable_in_input':true
	});

	// Touches de navigation
	shortcut.add(shortcuts['prev_entry'], prev_entry, {
		'disable_in_input':true
	});
	shortcut.add("shift+"+shortcuts['prev_entry'], function () {
		old_active = $(".flux.active");
		first = $(".flux:first");

		if (first.hasClass("flux")) {
			toggleContent (first, old_active);
		}
	}, {
		'disable_in_input':true
	});
	shortcut.add(shortcuts['next_entry'], next_entry, {
		'disable_in_input':true
	});
	shortcut.add("shift+"+shortcuts['next_entry'], function () {
		old_active = $(".flux.active");
		last = $(".flux:last");

		if (last.hasClass("flux")) {
			toggleContent (last, old_active);
		}
	}, {
		'disable_in_input':true
	});
	shortcut.add(shortcuts['go_website'], function () {
		url_website = $(".flux.active .link a").attr ("href");

		if (auto_mark_site) {
			$(".flux.active").each (function () {
				mark_read($(this), true);
			});
		}

		redirect (url_website, true);
	}, {
		'disable_in_input':true
	});
}

function init_stream_delegates(divStream) {
	divStream.on('click', '.flux_header .item.title, .flux_header .item.date', function (e) {	//flux_header_toggle
		old_active = $(".flux.active");
		new_active = $(this).parent ().parent ();
		if (e.target.tagName.toUpperCase() === 'A') {	//Leave real links alone
			if (auto_mark_article) {
				mark_read(new_active, true);
			}
			return true;
		}
		toggleContent (new_active, old_active);
	});

	divStream.on('click', '.flux a.read', function () {
		active = $(this).parents (".flux");
		mark_read (active, false);

		return false;
	});

	divStream.on('click', '.flux a.bookmark', function () {
		active = $(this).parents (".flux");
		mark_favorite (active);

		return false;
	});

	divStream.on('click', '.flux .content a', function () {
		$(this).attr ('target', '_blank');
	});

	divStream.on('click', '.item.title>a',function (e) {
		if (e.ctrlKey) return true;	//Allow default control-click behaviour such as open in backround-tab
		$(this).parent ().click ();	//Will perform toggle flux_content
		return false;
	});

	divStream.on('click', '.bigMarkAsRead', function() {
		url = $(".nav_menu a.read_all").attr ("href");
		redirect (url, false);
		return false;
	});

	if (auto_mark_site) {
		divStream.on('click', '.flux .link a', function () {
			mark_read($(this).parent().parent().parent(), true);
		});
	}
}

function init_nav_entries() {
	$('.nav_entries a.previous_entry').click(function() {
		prev_entry();
		return false;
	});
	$('.nav_entries a.next_entry').click(function() {
		next_entry();
		return false;
	});
	$('.nav_entries a.up').click(function() {
		var active_item = $(".flux.active");
		var windowTop = $(window).scrollTop();
		var item_top = active_item.position ().top;

		if (windowTop > item_top) {
			$("html,body").scrollTop (item_top);
		} else {
			$("html,body").scrollTop (0);
		}
		return false;
	});
}

function init_templates() {
	$('#aside_flux').on('click', '.dropdown-toggle', function () {
		if ($(this).nextAll('.dropdown-menu').length === 0) {
			var feed_id = $(this).closest('li').attr('id').substr(2),
				feed_web = $(this).data('fweb'),
				template = $('#feed_config_template').html().replace(/!!!!!!/g, feed_id).replace('http://example.net/', feed_web);
			$(this).attr('href', '#dropdown-' + feed_id).prev('.dropdown-target').attr('id', 'dropdown-' + feed_id).parent().append(template);
		}
	});
}

function init_actualize() {
	$("#actualize").click (function () {
		$.getScript('./?c=javascript&a=actualize').done(function() {
			updateFeeds ();
		});
		return false;
	});
}

function closeNotification () {
	$(".notification").slideUp (200, function () {
		$(".notification").remove ();
	});
}

function init_notifications() {
	notif = $(".notification");
	if (notif[0] !== undefined) {
		timer = setInterval('closeNotification()', 5000);

		notif.find ("a.close").click (function () {
			closeNotification ();
			return false;
		});
	}
}

$(function () {
	if (is_reader_mode()) {
		hide_posts = false;
	}
	init_posts ();
	init_column_categories ();
	init_shortcuts ();
	init_stream_delegates($('#stream'));
	init_nav_entries();
	init_templates();
	init_notifications();
	init_actualize();
});