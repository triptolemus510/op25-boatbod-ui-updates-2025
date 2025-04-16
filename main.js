
// Copyright 2017, 2018 Max H. Parke KA1RBI
// Copyright 2018, 2019, 2020, 2021 gnorbury@bondcar.com
// JavaScript UI Updates, Michael Rose, 2025
//
// This file is part of OP25
//
// OP25 is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 3, or (at your option)
// any later version.
//
// OP25 is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
// License for more details.
//
// You should have received a copy of the GNU General Public License
// along with OP25; see the file COPYING. If not, write to the Free
// Software Foundation, Inc., 51 Franklin Street, Boston, MA
// 02110-1301, USA.


var d_debug = 1;

var http_req = new XMLHttpRequest();
var counter1 = 0;
var error_val = null;
var auto_tracking = null;
var fine_tune = null;
var current_tgid = null;
var capture_active = false;
var hold_tgid = 0;
var send_busy = 0;
var send_qfull = 0;
var send_queue = [];
var req_cb_count = 0;
var request_count = 0;
var nfinal_count = 0;
var n200_count = 0;
var r200_count = 0;
var SEND_QLIMIT = 5;
var c_freq = 0;
var c_ppm = null;
var c_system = null;
var c_tag = null;
var c_stream_url = null;
var c_srctag = "";
var c_srcaddr = 0;
var c_grpaddr = 0;
var c_encrypted = 0;
var c_emergency = 0;
var c_nac = 0;
var c_name = "";
var channel_list = [];
var channel_index = 0;
var default_channel = null;
var enc_sym = "&#216;";

const mediaQuery = window.matchMedia("(min-width: 1500px)");
mediaQuery.addEventListener("change", handleColumnLayoutChange);

document.addEventListener("DOMContentLoaded", function() {
    var displaySystem    = document.getElementById("displaySystem");
    var displayFreq      = document.getElementById("displayFreq");

    var displayTalkgroup = document.getElementById("displayTalkgroup");
    var displayTgid      = document.getElementById("displayTgid");

    var displaySource    = document.getElementById("displaySource");
    var displaySourceId  = document.getElementById("displaySourceId");

//     var displayMode      = document.getElementById("displayMode");
    var displayEnc       = document.getElementById("displayEnc");
    var displayEmg       = document.getElementById("displayEmg");    
    
    var displayChannel	 = document.getElementById("displayChannel");
    var displayService	 = document.getElementById("displayService");

	const heightInput = document.getElementById("callHeightControl");
	const scrollDiv = document.querySelector(".call-history-scroll");
	
	if (heightInput && scrollDiv) {
	heightInput.addEventListener("input", () => {
	  const newHeight = parseInt(heightInput.value, 10);
	  if (!isNaN(newHeight) && newHeight >= 200 && newHeight <= 1000) {
		scrollDiv.style.height = `${newHeight}px`;
	  }
	});
	}
	
	
    if (!configFile) {
    	document.getElementById("smartColorToggle").checked = false;
    }
    
    if (configFile) {
		presets.forEach(preset => {
		  const btn = document.getElementById(`preset-btn-${preset.id}`);
		  if (btn) {
			btn.textContent = `${preset.label}`;
		  }
		});
	}
	
	loadSettingsFromLocalStorage();	
	
	const sizeInput = document.getElementById("plotSizeControl");
  
	sizeInput.addEventListener("input", () => {
	const newWidth = parseInt(sizeInput.value, 10);
	if (!isNaN(newWidth) && newWidth >= 100 && newWidth <= 1000) {
	  document.querySelectorAll(".plot-image").forEach(img => {
		img.style.width = `${newWidth}px`;
	  });
	}
	});
  
	handleColumnLayoutChange(mediaQuery);	
	
	updatePlotButtonStyles();
	
	document.getElementById("callHeightControl").addEventListener("input", saveSettingsToLocalStorage);
	document.getElementById("plotSizeControl").addEventListener("input", saveSettingsToLocalStorage);
	document.getElementById("smartColorToggle").addEventListener("change", saveSettingsToLocalStorage);	
	document.getElementById("adjacentSitesToggle").addEventListener("change", function () {
	  const container = document.getElementById("adjacentSitesContainer");
	  const checked = this.checked;
	
	  if (container) {
		container.style.display = checked ? "block" : "none";
	  }
	
	  // Save the updated setting
	  saveSettingsToLocalStorage();
	});		
	
//     loadSeenTalkgroups();
    
});


function do_onload() {
//     var ele = document.getElementById("div_status");
//     ele.style["display"] = "";
    set_tuning_step_sizes();
    send_command("get_terminal_config", 0, 0);
    setInterval(do_update, 1000);
//     b = document.getElementById("b1");
//     b.className = "nav-button-active";
}

var seenTalkgroups = [];   // DEPRECATED 

function find_parent(ele, tagname) {
    while (ele) {
        if (ele.nodeName == tagname)
            return (ele);
        else if (ele.nodeName == "HTML")
            return null;
        ele = ele.parentNode;
    }
    return null;
}

function f_command(ele, command) {
    var myrow = find_parent(ele, "TR");
    if (command == "delete") {
        var ok = confirm ("Confirm delete");
        if (ok)
            myrow.parentNode.removeChild(myrow);
    } else if (command == "clone") {
        var newrow = myrow.cloneNode(true);
        if (myrow.nextSibling)
            myrow.parentNode.insertBefore(newrow, myrow.nextSibling);
        else
            myrow.parentNode.appendChild(newrow);
    } else if (command == "new") {
        var mytbl = find_parent(ele, "TABLE");
        var newrow = null;
        if (mytbl.id == "chtable")
            newrow = document.getElementById("chrow").cloneNode(true);
        else if (mytbl.id == "devtable")
            newrow = document.getElementById("devrow").cloneNode(true);
        else
            return;
        mytbl.appendChild(newrow);
    }
}

function nav_update(command) {
	var names = ["b1", "b2", "b3"];
	var bmap = { "status": "b1", "plot": "b2", "about": "b3" };
	var id = bmap[command];
	for (var id1 in names) {
		b = document.getElementById(names[id1]);
		if (names[id1] == id) {
			b.className = "nav-button-active";
		} else {
			b.className = "nav-button";
		}
	}
}

function f_select(command) {

    var div_status = document.getElementById("div_status")
    var div_plot   = document.getElementById("div_plot")
    var div_about  = document.getElementById("div_about")
    var div_s1     = document.getElementById("div_s1")
    var div_s2     = document.getElementById("div_s2")
    var div_s3     = document.getElementById("div_s3")
    var ctl1 = document.getElementById("controls1");
    var ctl2 = document.getElementById("controls2");
    
    if (command == "status") {
        div_status.style['display'] = "";
        div_plot.style['display'] = "none";
        div_about.style['display'] = "none";
        div_s1.style['display'] = "";
        div_s2.style['display'] = "";
        div_s3.style['display'] = "";
        ctl1.style['display'] = "";
        ctl2.style['display'] = "none";
    }
    else if (command == "plot") {
        div_status.style['display'] = "";
        div_plot.style['display'] = "";
        div_about.style['display'] = "none";
        div_s1.style['display'] = "none";
        div_s2.style['display'] = "";
        div_s3.style['display'] = "none";
        ctl1.style['display'] = "none";
        ctl2.style['display'] = "";
    }
    else if (command == "about") {
        div_status.style['display'] = "none";
        div_plot.style['display'] = "none";
        div_about.style['display'] = "";
        ctl1.style['display'] = "none";
        ctl2.style['display'] = "none";
    }
    nav_update(command);
}

function is_digit(s) {
    if (s >= "0" && s <= "9")
        return true;
    else
        return false;
}

function term_config(d) {
    var lg_step = 1200;
    var sm_step = 100;
    var updated = 0;

    if ((d["tuning_step_large"] != undefined) && (d["tuning_step_large"] != lg_step)) {
        lg_step = d["tuning_step_large"];
        updated++;
    }
    if ((d["tuning_step_small"] != undefined) && (d["tuning_step_small"] != sm_step)) {
        sm_step = d["tuning_step_small"];
        updated++;
    }
    if (updated) {
        set_tuning_step_sizes(lg_step, sm_step);
    }
    if ((d["default_channel"] != undefined) && (d["default_channel"] != "")) {
        default_channel = d["default_channel"];
    }
}

function set_tuning_step_sizes(lg_step=1200, sm_step=100) {

	// this seems needlessly complex  - TODO: remove unused bits, fix tune values which are hard coded into the UI buttons now
    var title_str = "Adjust tune ";

    var bn_t1_U = document.getElementById("t1_U");
    var bn_t2_U = document.getElementById("t2_U");
    var bn_t1_D = document.getElementById("t1_D");
    var bn_t2_D = document.getElementById("t2_D");
    var bn_t1_u = document.getElementById("t1_u");
    var bn_t2_u = document.getElementById("t2_u");
    var bn_t1_d = document.getElementById("t1_d");
    var bn_t2_d = document.getElementById("t2_d");

    if ((bn_t1_U != null) && (bn_t2_U != null)) {
        bn_t1_U.setAttribute("title", title_str + "+" + lg_step);
        bn_t2_U.setAttribute("title", title_str + "+" + lg_step);
        bn_t1_U.setAttribute("onclick", "javascript:f_tune_button(" + lg_step + ");");
        bn_t2_U.setAttribute("onclick", "javascript:f_tune_button(" + lg_step + ");");
    }
    if ((bn_t1_D != null) && (bn_t2_D != null)) {
        bn_t1_D.setAttribute("title", title_str + "-" + lg_step);
        bn_t2_D.setAttribute("title", title_str + "-" + lg_step);
        bn_t1_D.setAttribute("onclick", "javascript:f_tune_button(-" + lg_step + ");");
        bn_t2_D.setAttribute("onclick", "javascript:f_tune_button(-" + lg_step + ");");
    }
    if ((bn_t1_u != null) && (bn_t2_u != null)) {
        bn_t1_u.setAttribute("title", title_str + "+" + sm_step);
        bn_t2_u.setAttribute("title", title_str + "+" + sm_step);
        bn_t1_u.setAttribute("onclick", "javascript:f_tune_button(" + sm_step + ");");
        bn_t2_u.setAttribute("onclick", "javascript:f_tune_button(" + sm_step + ");");
    }
    if ((bn_t1_d != null) && (bn_t2_d != null)) {
        bn_t1_d.setAttribute("title", title_str + "-" + sm_step);
        bn_t2_d.setAttribute("title", title_str + "-" + sm_step);
        bn_t1_d.setAttribute("onclick", "javascript:f_tune_button(-" + sm_step + ");");
        bn_t2_d.setAttribute("onclick", "javascript:f_tune_button(-" + sm_step + ");");
    }
}

function rx_update(d) {

	var plotsCount = d["files"].length;
	document.getElementById('plotsCount').innerText = plotsCount;

    plotfiles = [];
    
    if ((d["files"] != undefined) && (d["files"].length > 0)) {
        for (var i=0; i < d["files"].length; i++) {
            if (channel_list.length > 0) {
                expr = new RegExp("plot\-" + channel_list[channel_index] + "\-");
            }
            else {
                expr = new RegExp("plot\-0\-");
            }

            if (expr.test(d["files"][i])) {
                plotfiles.push(d["files"][i]);
            }
        }

        for (var i=0; i < 6; i++) {
            var img = document.getElementById("img" + i);
            if (i < plotfiles.length) {
                if (img['src'] != plotfiles[i]) {
                    img['src'] = plotfiles[i];
                    img.style["display"] = "";
                }
            }
            else {
                img.style["display"] = "none";
            }
        }
    }
    else {
        var img = document.getElementById("img0");
        img.style["display"] = "none";
    }
    
    updatePlotButtonStyles();
    
    if (d["error"] != undefined)
        error_val = d["error"];
    else
        error_val = null;
    if (d["fine_tune"] != undefined)
        fine_tune = d["fine_tune"];
}

// frequency, system, and talkgroup display

function change_freq(d) {
// 	console.log(d);

	console.log("change freq() called");
	
    c_freq = d['freq'];
    c_system = d['system'];
    current_tgid = d['tgid'];
    c_tag = d['tag'];
    displayTalkgroup.innerText = c_tag;
    c_stream_url = d['stream_url'];
    channel_status();
}

function channel_update(d) {
	
// 	console.log(d);
	
    var s2_c  = document.getElementById("s2_ch_lbl");
    var s2_d  = document.getElementById("s2_ch_txt");
    var s2_e  = document.getElementById("s2_ch_dn");
    var s2_f  = document.getElementById("s2_ch_dmp");
    var s2_g  = document.getElementById("s2_ch_up");
    var s2_hc = document.getElementById("s2_ch_cap");
    var s2_ht = document.getElementById("s2_ch_trk");

    if (d['channels'] != undefined) {
        channel_list = d['channels'];

        if (channel_list.length > 0) {
            // if this is the first update, find the default_channel if specified
            if (default_channel != null && default_channel != "") {
                for (ch_id = 0; ch_id < channel_list.length; ch_id++) {
                    if (d[ch_id]['name'] == default_channel) {
                        channel_index = ch_id;
                        break;
                    }
                }
                default_channel = null;
            }

            // display channel information
            var c_id = channel_list[channel_index];
            c_system = d[c_id]['system'];
            
            c_svcopts = d[c_id]['svcopts'];
            
            c_name = "" + c_id + ": ";
            if ((d[c_id]['name'] != undefined) && (d[c_id]['name'] != "")) {
                c_name += " " + d[c_id]['name'];
            }
            else {
                c_name += " " + c_system;
            }

            c_freq = d[c_id]['freq'];
			            
            c_ppm = d[c_id]['ppm'];
            if (d[c_id]['error'] != undefined)
                error_val = d[c_id]['error'];
            else
                error_val = null;
            if (d[c_id]['auto_tracking'] != undefined)
                auto_tracking = d[c_id]['auto_tracking'];
                
            current_tgid = d[c_id]['tgid'];
            c_tag = d[c_id]['tag'];
            
            c_srcaddr = d[c_id]['srcaddr'];
            c_srctag = d[c_id]['srctag'];
            
            c_stream_url = d[c_id]['stream_url'];
            capture_active = d[c_id]['capture'];
            hold_tgid = d[c_id]['hold_tgid'];

// TODO: housekeeping here
            
        if (hold_tgid != 0) {

            document.getElementById("btn-hold").style.color = "red";
			// document.getElementById("btn-hold").textContent = hold_tgid;      // places the hold tgid in the hold button
		} else {
			document.getElementById("btn-hold").style.color = ""; // Resets to stylesheet
			document.getElementById("btn-hold").textContent = "HOLD";
			
		}
                
            c_encrypted = d[c_id]['encrypted'];
            c_emergency = d[c_id]['emergency'];

			// these are still used 
            s2_e.style['display'] = "";
            s2_f.style['display'] = "";
            s2_g.style['display'] = "";
            s2_hc.style['display'] = "";
            s2_ht.style['display'] = "";
            
            c_tdma = d[c_id]['tdma'];
            
            displayChannel.innerText		= c_name;
            plotChannelDisplay.innerText	= c_name;
            
            displaySystem.innerText 		= c_system ? c_system : "-";
            
   			displayFreq.innerText 			= (parseInt(c_freq) / 1000000.0).toFixed(6);
            displayTalkgroup.innerText 		= c_tag ? c_tag : "Talkgroup " + current_tgid;
            
            displayTgid.innerText 			= current_tgid ? current_tgid : "-";
            displaySource.innerText 		= c_srctag ? c_srctag : "ID: " + c_srcaddr;
            
            applySmartColorToTgidSpan();
            
            if ( displaySource.innerText == "ID: 0")
            	 displaySource.innerText = " ";
            	 
            displaySourceId.innerText 	= c_srcaddr ? c_srcaddr : "-";
            
			// Encryption			
			if (!c_encrypted) displayEnc.innerText = "-";
			
			if (c_encrypted == 1) {
			  displayEnc.innerText = "Encrypted";
			  displayEnc.style.color = "red";
			  displayTalkgroup.innerHTML += " &nbsp;&nbsp;&nbsp; " + enc_sym;
			} else {
			  displayEnc.innerText = "-";
			  displayEnc.style.color = ""; // fallback to CSS default
			}
			
			if (c_encrypted == 0) {
			  displayEnc.innerText = "Clear";
			  displayEnc.style.color = ""; // fallback to CSS default
			}
			
			if (c_encrypted == undefined) displayEnc.innerText = "-";
			
			// Emergency
			if (c_emergency == 1) {
			  displayEmg.innerText = "EMERGENCY";
			  displayEmg.style.color = "red";
			} else {
			  displayEmg.innerText = "-";
			  displayEmg.style.color = ""; // fallback to CSS default
			}
            
            if (c_svcopts == 0) c_svcopts = "-";
            displayService.innerText = c_svcopts;
            
            // not currently used, although this may still be useful...
			// trackTalkgroup(c_system, current_tgid, c_tag); // creates an index of talkgroup IDs and Talkgroup Tags to use later          
            
        }
        else {
            s2_c.style['display'] = "none";
            s2_d.style['display'] = "none";
            s2_e.style['display'] = "none";
            s2_f.style['display'] = "none";
            s2_g.style['display'] = "none";
            s2_hc.style['display'] = "none";
            s2_ht.style['display'] = "none";
            c_name = "";
            c_freq = 0.0;
            c_system = "";
            current_tgid = 0;
            c_tag = "";
            c_srcaddr = 0;
            c_srctag = "";
            c_stream_url = "";
            c_encrypted = 0;
            c_emergency = 0;
        }
        channel_status();
    }
}

function channel_status() {

    var html;
    var s2_freq = document.getElementById("s2_freq");
    var s2_tg = document.getElementById("s2_tg");
    var s2_grp = document.getElementById("s2_grp");
    var s2_src = document.getElementById("s2_src");
    var s2_ch_txt = document.getElementById("s2_ch_txt");
    var s2_cap = document.getElementById("cap_bn");
    var s2_trk = document.getElementById("trk_bn");
    
    // the speaker icon in the main display and the url in the Settings div
    var streamButton = document.getElementById("streamButton");
	var streamURL = document.getElementById("streamURL");
	
	
	// TODO: housekeeping in this section.  some of this html is no longer needed.
	
    html = "";

    if (c_stream_url != undefined) {
        html += "<a href=\"" + c_stream_url + "\">";
        var streamHTML = "<a a href='" + c_stream_url + "' target='_blank'>&#128264;</a>";
        streamButton.innerHTML = streamHTML;
        streamURL.innerHTML = streamHTML + " " + c_stream_url    
    }
    
    html += "<span class=\"value\">" + (c_freq / 1000000.0).toFixed(6) + "</span>";
    if (c_stream_url != "") {
        html += "</a>"
    }

	// TODO: c_ppm is not displayed anywhere in the new UI. What is it?
	if (c_ppm != null) {
        html += "<span class=\"value\"> (" + c_ppm.toFixed(3) + ")</span>";
    }
//     s2_freq.innerHTML = html  //DEPRECATED 
    if ((c_system != null) && (channel_list.length == 0))
    {
//         s2_ch_txt.innerHTML = "<span class=\"value\"> &nbsp;" + c_system + "</span>";   // DEPRECATED
//         s2_ch_txt.style['display'] = "";
    }

//     html = "";
//     if (c_tag != null) {
//         html += "<span class=\"value\">" + c_tag + "</span>";
//         if ((current_tgid != null) && (c_emergency)) {
//             html += "<span class=\"value\"> [EMERGENCY]</span>";
//         }
//         if ((current_tgid != null) && (c_encrypted)) {
//             html += "<span class=\"value\"> [ENCRYPTED]</span>";
//         }
//     }
//     else
//     {
//         html += "<span class=\"value\">&nbsp;</span>";
//     }
    
//     s2_tg.innerHTML = html; // DEPRECATED

    html = "";
    
	// TODO: what is c_grpaddr ?
    if (current_tgid != null) {
        html += "<span class=\"value\">" + current_tgid + "</span>";
        if (hold_tgid != 0) {
            html += "<span class=\"value\"> [HOLD]</span>";
		} else {
		}
    }
    else if (c_grpaddr != 0) {
        html += "<span class=\"value\">" + c_grpaddr + "</span>";
    }
    else
    {
        html += "<span class=\"value\">&nbsp;</span>";
    }
	
    if (capture_active)
        document.getElementById('cap_bn').innerText = "Stop Capture";
    else
        document.getElementById('cap_bn').innerText = "Start Capture";
    if (auto_tracking)
        document.getElementById('trk_bn').innerText = "Tracking Off";
    else
        document.getElementById('trk_bn').innerText = "Tracking On";
        
}

// patches table

function patches(d) {
    if (d['patch_data'] == undefined || Object.keys(d['patch_data']).length < 1) {
    	document.getElementById('patchesContainer').style.display = "none";
        return "";
    }

	document.getElementById('patchesContainer').style.display = "";
	
    var is_p25 = (d['type'] == 'p25');
    var is_smartnet = (d['type'] == 'smartnet');

    // Only supported on P25 and Type II currently
    if (!is_p25 && !is_smartnet) {
    	document.getElementById('patchesContainer').style.display = "none";
        return;
    }

    var html = "<table class=compact-table>";
    html += "<tr><th colspan=99 class='th-section'>Patches</th></tr>";
    if (is_p25) {
        html += "<tr><th>Supergroup</th><th>Group</th></tr>";
    } else if (is_smartnet) {
        html += "<tr><th colspan=2>TG</th><th colspan=2>Sub TG</th><th>Mode</th></tr>";
    }
    var ct = 0;
    for (var tgid in d['patch_data']) {
        var color = "";  // "#d0d0d0";
        if ((ct & 1) == 0)
            color = "";  // "#c0c0c0";
        ct += 1;

        num_sub_tgids = Object.keys(d['patch_data'][tgid]).length
        var row_num = 0;
        for (var sub_tgid in d['patch_data'][tgid]) {
            if (++row_num == 1) {
                html += "<tr style=\"background-color: " + color + ";\">";
                if (is_p25) {
                    html += "<td rowspan=" + num_sub_tgids + ">" + d['patch_data'][tgid][sub_tgid]['sg'] + "</td>";
                } else if (is_smartnet) {
                    html += "<td rowspan=" + num_sub_tgids + ">" + d['patch_data'][tgid][sub_tgid]['tgid_dec'] + "</td><td rowspan=" + num_sub_tgids + ">" + d['patch_data'][tgid][sub_tgid]['tgid_hex'] + "</td>";
                }
            } else {
                html += "<tr style=\"background-color: " + color + ";\">";
            }
            if (is_p25) {
                html += "<td>" + d['patch_data'][tgid][sub_tgid]['ga'] + "</td>";
            } else if (is_smartnet) {
                html += "<td>" + d['patch_data'][tgid][sub_tgid]['sub_tgid_dec'] + "</td><td>" + d['patch_data'][tgid][sub_tgid]['sub_tgid_hex'] + "</td>";
                html += "<td>" + d['patch_data'][tgid][sub_tgid]['mode'] + "</td>";
            }
            html += "</tr>";
        }
    }
    html += "</table><br>";

// end patch table
// 	html = replaceTgidsWithTags(html); 
	document.getElementById('patchesTable').innerHTML = html;
	
    return html;
}

// adjacent sites table

function adjacent_sites(d) {

    if (d['adjacent_data'] == undefined || Object.keys(d['adjacent_data']).length < 1) {
        return "";
    }

    var is_p25 = (d['type'] == 'p25');
    var is_smartnet = (d['type'] == 'smartnet');

    // Only supported on P25 and Type II currently
    if (!is_p25 && !is_smartnet) {
    	document.getElementById('adjacentSitesContainer').style.display = "none";
        return "";
    }

    var html = "<table class='compact-table'";
    html += "<tr><th colspan=99 class='th-section'>Adjacent Sites</th></tr>";
    if (is_p25) {
        html += "<tr><th>System</th><th>Site Name<th>RFSS</th><th>Site</th><th>Frequency</th><th>Uplink</th></tr>";
        var ct = 0;
        // Ordered by RFSS then site number
        var adjacent_by_rfss = {};
        for (var freq in d['adjacent_data']) {
            var rfss = d['adjacent_data'][freq]["rfid"];
            var site = d['adjacent_data'][freq]["stid"];
            if (!(rfss in adjacent_by_rfss)) {
                adjacent_by_rfss[rfss] = {};
            }
            if (!(site in adjacent_by_rfss[rfss])) {
                adjacent_by_rfss[rfss][site] = {};
            }
            adjacent_by_rfss[rfss][site]['cc_rx_freq'] = (freq / 1000000.0).toFixed(6);
            adjacent_by_rfss[rfss][site]['cc_tx_freq'] = (d['adjacent_data'][freq]["uplink"] / 1000000.0).toFixed(6);
        }
        
       
        for (var rfss in adjacent_by_rfss) {
            for (var site in adjacent_by_rfss[rfss]) {
                var color = "";
                if ((ct & 1) == 0)
                    color = "";
                ct += 1;
  				
                displaySiteName = getSiteAlias(d['sysid'], rfss, site);
  
                html += "<tr style=\"background-color: " + color + ";\"><td>" + d['sysid'].toString(16).toUpperCase() + "<td style=text-align:left;>" + displaySiteName + "</td><td>" + rfss + "</td><td>" + site + "</td><td>" + adjacent_by_rfss[rfss][site]["cc_rx_freq"] + "</td><td>" + adjacent_by_rfss[rfss][site]["cc_tx_freq"] + "</td></tr>";
            }
        }
    } else if (is_smartnet) {
        html += "<tr><th>Site</th><th>Frequency</th><th>Uplink</th></tr>";
        var ct = 0;
        // Ordered by site number
        var adjacent_by_site = {};
        for (var freq in d['adjacent_data']) {
            var site = d['adjacent_data'][freq]["stid"];
            adjacent_by_site[site] = {};
            adjacent_by_site[site]['cc_rx_freq'] = (freq / 1000000.0).toFixed(6);
            adjacent_by_site[site]['cc_tx_freq'] = (d['adjacent_data'][freq]["uplink"] / 1000000.0).toFixed(6);
        }
        for (var site in adjacent_by_site) {
            var color = "#d0d0d0";
            if ((ct & 1) == 0)
                color = "#c0c0c0";
            ct += 1;
            html += "<tr style=\"background-color: " + color + ";\"><td>" + site + "</td><td>" + adjacent_by_site[site]["cc_rx_freq"] + "</td><td>" + adjacent_by_site[site]["cc_tx_freq"] + "</td></tr>";
        }
    }
    html += "</table><br>";

// end adjacent sites table

	document.getElementById('adjacentSitesTable').innerHTML = html;
    return html;
}

// additional system info: wacn, sysID, rfss, site id, secondary control channels, freq error

function trunk_update(d) {



    var do_hex = {"syid":0, "sysid":0, "wacn": 0};
    var do_float = {"rxchan":0, "txchan":0};
    var srcaddr = 0;
    var encrypted = 0;
    var html = "";

    if (d['nac'] != undefined)
        c_nac = d['nac']

    for (var nac in d) {
        if (!is_digit(nac.charAt(0)))
            continue;

        // If 'system' name is defined, use it to correlate system info with channel currently selected
        // used by multi_rx.py trunking
        if (d[nac]['system'] != undefined) {
            if (d[nac]['system'] != c_system) {
                continue;
            }
            else {
                c_nac = d['nac'];
            }
        }
        // Otherwise use c_nac which is derived from "current_nac" parameter in 'change_freq' message
        // used by legacy rx.py trunking
        else if (nac != c_nac) {
            continue;
        }

        html += "<span class=\"nac\">";
        html += d[nac]['top_line'];
        html += "</span><br>";

        var is_p25 = (d[nac]['type'] == 'p25');
        var is_smartnet = (d[nac]['type'] == 'smartnet');

        if (d[nac]['rfid'] != undefined)
            html += "<span class=\"label\">RFSS ID: </span><span class=\"value\">" + d[nac]['rfid'] + " </span>";
        if (d[nac]['stid'] != undefined)
            html += "<span class=\"label\">Site ID: </span><span class=\"value\">" + d[nac]['stid'] + "</span><br>";
        if (d[nac]['secondary'] != undefined && d[nac]["secondary"].length) {
            html += "<span class=\"label\">";
            if (is_p25)
                html += "Secondary";
            else
                html += "Alternate";
            html += " control channel(s): </span><span class=\"value\"> ";
            for (i=0; i<d[nac]["secondary"].length; i++) {
                if (i != 0)
                    html += ", ";
                html += (d[nac]["secondary"][i] / 1000000.0).toFixed(6);
            }
            html += "</span><br>";
        }
        if (error_val != null) {
            if (auto_tracking != null) {
                html += "<span class=\"label\">Frequency error: </span><span class=\"value\">" + error_val + " Hz. (approx)</span><span class=\"label\"> auto tracking: </span><span class=\"value\">" + (auto_tracking ? "on" : "off") + " </span><br>";
            }
            else {
                html += "<span class=\"label\">Frequency error: </span><span class=\"value\">" + error_val + " Hz. (approx)</span><br>";
            }
        }
        if (fine_tune != null) {
            html += "<span class=\"label\">Fine tune offset: </span><span class=\"value\">" + fine_tune + "</span>";
        }
        var div_s1     = document.getElementById("div_s1")
        
//         div_s1.innerHTML = html;  //DEPRECATED

// system information and frequencies table



		var displaySystemName = d[nac]['system'] !== undefined ? d[nac]['system'] : "-";
		var topLine = d[nac]['top_line'] !== undefined ? d[nac]['top_line'] : "-";
		var displayCallSign = d[nac]['callsign'] !== undefined ? d[nac]['callsign'] : "-";
		var totalTsbk = topLine !== "-" ? comma(extractLastNumber(topLine)) : "-";
		var tsbkTime = d[nac]['last_tsbk'] !== undefined ? d[nac]['last_tsbk'] : "-";
		var displayWacn = d[nac]['wacn'] !== undefined ? d[nac]['wacn'] : "-";
		var displayNac = d[nac]['nac'] !== undefined ? d[nac]['nac'] : "-";
		var displaySystemId = d[nac]['sysid'] !== undefined ? d[nac]['sysid'] : "-";
		var displayType = d[nac]['type'] !== undefined ? d[nac]['type'] : "-";
		var displayRfss = d[nac]['rfid'] !== undefined ? d[nac]['rfid'] : "-";
		var displaySiteId = d[nac]['stid'] !== undefined ? d[nac]['stid'] : "-";
		
		var displaySiteName = getSiteAlias(displaySystemId, displayRfss, displaySiteId);
// 		console.log (displaySiteName);

		if (displayCallSign.length < 2)
			displayCallSign = "-";
		
		if (error_val === null || error_val === undefined || isNaN(error_val)) {
			error_val = "&nbsp;&nbsp;&nbsp;&nbsp;";
		}
		

        html = "<table class='compact-table'>";
        
        html += "<tr><th colspan=99 class='th-section'>" + displaySiteName + "</th></tr>";
    

		// System Information table (above frequency display)
		const trunkFields = [
		  { label: "Callsign", value: hex(displayCallSign) },
		  { label: "Type", value: hex(displayType) },
		  { label: "System ID", value: hex(displaySystemId) },
		  { label: "WACN", value: hex(displayWacn) },
		  { label: "NAC", value: hex(displayNac) },
		  { label: "RFSS", value: hex(displayRfss) },
		  { label: "Site", value: hex(displaySiteId) },
		  { label: "Error", value: `${error_val} Hz` },
		  { label: "TSBK", value: totalTsbk },
		  { label: "Last TSBK", value: getTime(tsbkTime), colspan: 2 }
		];
		
		let htmlParts = ["<tr>"];
		
		trunkFields.forEach(field => {
		  const colspan = field.colspan ? ` colspan="${field.colspan}"` : "";
		  htmlParts.push(
			`<td style="text-align:center;"${colspan}><span class="trunk-label">${field.label}</span><br><span class="trunk-value">${field.value}</span></td>`
		  );
		});

		html += htmlParts.join("");


		// TODO: fix this, or? I don't see 'fine_tune' in tk_p25.py anywhere...  not using for now.
		// html += "<td style='text-align:center';><span class=small-label>Fine Tune</span> <br> <span class=small-value>" + fine_tune + "</span></td>";
    
        html += "</table>"
    
        html += "<div class=\"info\"><div class=\"system\">";
        html += "<table id=frequencyTable class=compact-table border=0 borderwidth=0 cellpadding=0 cellspacing=0 width=100%>"; // was width=350
        html += "<colgroup>";
        html += "<col span=\"1\" style=\"width:20%;\">";
        html += "<col span=\"1\" style=\"width:12.5%;\">";
        html += "<col span=\"1\" style=\"width:20%;\">";
        html += "<col span=\"1\" style=\"width:20%;\">";
        html += "<col span=\"1\" style=\"width:15%;\">";
        html += "<col span=\"1\" style=\"width:12.5%;\">";
        html += "</colgroup>";
        html += "<tr><th>Frequency</th><th>Last</th><th colspan=2>Active Talkgoup&nbspID</th><th>Mode</th><th>Voice Count</th></tr>";
        var ct = 0;
                
        for (var freq in d[nac]['frequency_data']) {
        
            chan_type = d[nac]['frequency_data'][freq]['type'];
            last_activity = d[nac]['frequency_data'][freq]['last_activity'];
            tg1 = d[nac]['frequency_data'][freq]['tgids'][0];
            tg2 = d[nac]['frequency_data'][freq]['tgids'][1];
            
            // TODO: 
//             src1 = d[nac]['frequency_data'][freq]['srcaddr'][0];
//             src2 = d[nac]['frequency_data'][freq]['srcaddr'][1];
			// need to properly bring over srcaddr from python
		
			let tag1 = (tg1 != null && tg1 !== "")
			  ? (d[nac]?.frequency_data?.[freq]?.tags?.[0] || `Talkgroup ${tg1}`)
			  : " ";
			
			let tag2 = (tg2 != null && tg2 !== "")
			  ? (d[nac]?.frequency_data?.[freq]?.tags?.[1] || `Talkgroup ${tg2}`)
			  : " ";
                        
            mode = d[nac]['frequency_data'][freq]['mode'];
            count = d[nac]['frequency_data'][freq]['counter'];
            			
            var mode_str = "<td></td>"
            
            // Do alternate first because active TGs will deliberately overwrite the mode
            if (chan_type == 'alternate') {
                if (is_p25)
                    mode_str = "<td style=\"text-align:center;\">Sec CC</td>"
                else if (is_smartnet)
                    mode_str = "<td style=\"text-align:center;\">Alt CC</td>"
                else
                    mode_str = "<td style=\"text-align:center;\">Alt CC</td>"
            }

            var achMode = "-";
            
            // Now actually handle the appropriate channel type if not alternate
            if (chan_type == 'control') {
                tg_str = "<td style=\"text-align:center; color:gray;\" colspan=2>Control</td>";
                // Deliberately 6 or 8 characters wide, to ensure the column stays the right width without flickering
                // when call status flags come and go with calls
                if (is_p25)
                    mode_str = "<td style=\"text-align:center;\">&nbsp;&nbsp;CC&nbsp;&nbsp;</td>"
                else if (is_smartnet)
                    mode_str = "<td style=\"text-align:center;\">&nbsp;&nbsp;&nbsp;CC&nbsp;&nbsp;&nbsp;</td>"
                else
                    mode_str = "<td style=\"text-align:center;\">CC</td>"
                count = "";
            }
            else {
                if (is_smartnet && (tg1 != null || tg2 != null))
                    mode_str = "<td style=\"text-align:center;\">" + mode + "</td>"

                if (tg1 == null && tg2 == null) {
                    tg_str = "<td style=\"text-align:center;\" colspan=2>&nbsp&nbsp-&nbsp&nbsp</td>";
                }
                else if (tg1 == tg2) {
                    if (is_p25) {
                        mode_str = "<td style=\"text-align:center;\">FDMA</td>";
                        achMode = "FDMA";
                    }
                    tg_str = "<td style=\"text-align:center;white-space: nowrap;\" colspan=2>" + tg1 + " &nbsp; " + tag1.substring(0, MAX_TG_CHARS) + "</td>";
//                     tg_str = "<td style=\"text-align:center;white-space: nowrap;\" colspan=2>" + tg1 + " &nbsp; " + tag1.substring(0, MAX_TG_CHARS) + "<br>" + src1 + "</td>";
                }
                else {
                    if (is_p25) {
                        mode_str = "<td style=\"text-align:center;\">TDMA</td>";
                        achMode = "TDMA";
					}                    
                    if (tg1 == null)
                        tg1 = "&nbsp&nbsp-&nbsp&nbsp";
                    if (tg2 == null)
                        tg2 = "&nbsp&nbsp-&nbsp&nbsp";
                    tg_str = "<td style=\"text-align:center;white-space: nowrap;\">" + tg2 + " &nbsp; " + tag2.substring(0, MAX_TG_CHARS) + "</td><td style=\"text-align:center;white-space: nowrap;\">" + tg1 + " &nbsp; " + tag1.substring(0, MAX_TG_CHARS) + "</td>";
//                     tg_str = "<td style=\"text-align:center;white-space: nowrap;\">" + tg2 + " &nbsp; " + tag2.substring(0, MAX_TG_CHARS) + "<br>" + src2 + "</td><td style=\"text-align:center;white-space: nowrap;\">" + tg1 + " &nbsp; " + tag1.substring(0, MAX_TG_CHARS) + "<br>" + src1 + "</td>";
                }
            }


			// Append Call History
        	if (d[nac]['sysid'] !== undefined && (tg1 !== undefined || tg2 !== undefined)) {
        		// TODO:  srcaddr
				appendCallHistory(d[nac]['sysid'], tg1, tg2, tag1, tag2, achMode);
			}          

            ct += 1;
            html += "<tr>";
            html += "<td>" + (parseInt(freq) / 1000000.0).toFixed(6) + "</td>";

            html += "<td style=\"text-align:center;\">" + last_activity + "</td>";
            html += tg_str;
            html += mode_str;
            html += "<td style=\"text-align:right;\">" + comma(count) + "</td>";
            html += "</tr>";
        }
        
        html += "</table></div>";

		document.getElementById("frequenciesTable").innerHTML = html;  // new UI

		applySmartColorsToFrequencyTable();
       
// end system freqencies table

		
//         html += "<div class=\"right_column\">";
        html += patches(d[nac]);
        html += adjacent_sites(d[nac]);
//         html += "</div></div></div>";
    }


    if (d['srcaddr'] != undefined)
        c_srcaddr = d['srcaddr']
    if (d['grpaddr'] != undefined)
        c_grpaddr = d['grpaddr']
    if (d['encrypted'] != undefined)
        c_encrypted = d['encrypted']
    if (d['emergency'] != undefined)
        c_emergency = d['emergency']


    channel_status();
}

function plot(d) {
    //TODO: implement local plot rendering using json data
}

function http_req_cb() {
    req_cb_count += 1;
    s = http_req.readyState;
    if (s != 4) {
        nfinal_count += 1;
        return;
    }
    if (http_req.status != 200) {
        n200_count += 1;
        return;
    }
    r200_count += 1;
    var dl = JSON.parse(http_req.responseText);
    var dispatch = {'trunk_update': trunk_update, 'change_freq': change_freq, 'channel_update': channel_update, 'rx_update': rx_update, 'terminal_config': term_config, 'plot': plot}
    for (var i=0; i<dl.length; i++) {
        var d = dl[i];
        if (!("json_type" in d))
            continue;
        if (!(d["json_type"] in dispatch))
            continue;
console.log(d);
        dispatch[d["json_type"]](d);
    }
}


function do_update() {
    if (channel_list.length == 0) {
        send_command("update", 0, 0);
    }
    else {
        send_command("update", 0, Number(channel_list[channel_index]));
    }
    f_debug();
}

function send_command(command, arg1 = 0, arg2 = 0) {
    request_count += 1;
    if (send_queue.length >= SEND_QLIMIT) {
        send_qfull += 1;
        send_queue.unshift();
    }
    send_queue.push( {"command": command, "arg1": arg1, "arg2": arg2} );
    send_process();
}

function send_process() {
    s = http_req.readyState;
    if (s != 0 && s != 4) {
        send_busy += 1;
        return;
    }
    http_req.open("POST", "/");
    http_req.onreadystatechange = http_req_cb;
    http_req.setRequestHeader("Content-type", "application/json");
    cmd = JSON.stringify( send_queue );
    send_queue = [];
    http_req.send(cmd);
}

function f_chan_button(command) {
    channel_index += command;
    if (channel_index < 0) {
        channel_index = channel_list.length - 1;
    }
    else if (channel_index >= channel_list.length) {
        channel_index = 0;
    }
}

function f_dump_button(command) {
    send_command('dump_tgids', 0, Number(channel_list[channel_index]));
    send_command('dump_tracking', 0, Number(channel_list[channel_index]));
}

function f_cap_button(command) {
    send_command('capture', 0, Number(channel_list[channel_index]));
}

function f_trk_button(command) {
    send_command('set_tracking', command, Number(channel_list[channel_index]));
}

function f_tune_button(command) {

	_tune = parseInt(command, 10);
	
    if (channel_list.length == 0) {
        send_command('adj_tune', _tune, 0);
    }
    else {
        send_command('adj_tune', _tune, Number(channel_list[channel_index]));
    }
}

function f_plot_button(command) {
    if (channel_list.length == 0) {
        send_command('toggle_plot', command, 0);
    }
    else {
        send_command('toggle_plot', command, Number(channel_list[channel_index]));
    }
    
    updatePlotButtonStyles();
}

function f_preset(i) {

	// TODO - this doesn't care about more than 1 channel_index	

	const preset = presets.find(p => p.id === i);
	
	if (!preset) {
		console.warn(`No preset found for ID ${i}`);
	return;
	}

	const command = "hold";

	_tgid = preset.tgid;

	if (isNaN(_tgid) || (_tgid < 0) || (_tgid > 65535))
	_tgid = 0;

    if (channel_list.length == 0) {
    
       	if (command == "hold")
    		send_command("whitelist", _tgid);
    
        send_command(command, _tgid);

        
    } else {
    
    	if (command == "hold")
    		send_command("whitelist", _tgid, Number(channel_list[channel_index]));

        send_command(command, _tgid, Number(channel_list[channel_index]));
    }
}

function f_scan_button(command) {

	console.log(command);
    var _tgid = 0;

    if (command == "goto") {

        command = "hold"
        if (current_tgid != null)
           _tgid = current_tgid;
        _tgid = parseInt(prompt("Enter tgid to hold", _tgid));
        
        
        if (isNaN(_tgid) || (_tgid < 0) || (_tgid > 65535))
            _tgid = 0;
    }
    else if ((command == "lockout") && (current_tgid == null)) {
        _tgid = parseInt(prompt("Enter tgid to blacklist", _tgid));
        if (isNaN(_tgid) || (_tgid <= 0) || (_tgid > 65534))
            return;
    }
    else if (command == "whitelist") {
        _tgid = parseInt(prompt("Enter tgid to whitelist", _tgid));
        if (isNaN(_tgid) || (_tgid <= 0) || (_tgid > 65534))
            return;
    }
    else if (command == "set_debug") {
        _tgid = parseInt(prompt("Enter logging level", _tgid));
        if (isNaN(_tgid) || (_tgid < 0) )
            return;
    }

    if (channel_list.length == 0) {
    
       	if (command == "hold")
    		send_command("whitelist", _tgid);
    
        send_command(command, _tgid);
        console.log("method A");
    }
    else {
    
    	if (command == "hold")
    		send_command("whitelist", _tgid, Number(channel_list[channel_index]));

        send_command(command, _tgid, Number(channel_list[channel_index]));
        console.log("method B");
    }
}

function f_debug() {
	if (!d_debug) return;
	var html = "busy " + send_busy;
	html += " qfull " + send_qfull;
	html += " sendq size " + send_queue.length;
	html += " requests " + request_count;
	html += "<br>callbacks:";
	html += " total=" + req_cb_count;
	html += " incomplete=" + nfinal_count;
	html += " error=" + n200_count;
	html += " OK=" + r200_count;
	html += "<br>";
	var div_debug = document.getElementById("div_debug");
	div_debug.innerHTML = html;
}


// new functions

function trackTalkgroup(c_system, current_tgid, c_tag) {

	return; // DEPRECATAED for now, maybe useful later?
	
    // Ignore control channel or tgid 0
    if (
        Number(current_tgid) === 0 ||
        typeof c_tag === "string" && c_tag.toLowerCase() === "control channel"
    ) {
        return;
    }

    const exists = seenTalkgroups.some(entry =>
        entry.system === c_system && entry.tgid === Number(current_tgid)
    );

    if (!exists) {
        seenTalkgroups.push({
            system: c_system,
            tgid: Number(current_tgid),
            tag: c_tag
        });
        saveSeenTalkgroups();
        console.log(`Added talkgroup: ${c_system} / ${current_tgid} - ${c_tag}`);
    }
}

function replaceTgidsWithTags(html) {
	
	// this was used prior to sending over tags in the trunk_update payload
	// not used currently
	
	return;

    // Loop through the seen talkgroups
    seenTalkgroups.forEach(entry => {
        // Build a regex to find standalone TGIDs (not part of other numbers)
        let regex = new RegExp(`(?<!\\d)${entry.tgid}(?!\\d)`, 'g');

        // Replace TGID with "TGID - TAG"
        html = html.replace(regex, `${entry.tgid}&nbsp;&nbsp;${entry.tag}`);
    });

    return html;
}

function comma(x) {
    // add comma formatting to whatever you give it (xx,xxxx,xxxx)
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


function getTime(ts) {
    const date = new Date(ts * 1000); // convert to milliseconds
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function extractLastNumber(str) {
    const match = str.match(/(\d+)(?!.*\d)/);
    return match ? parseInt(match[0], 10) : null;
}

function appendCallHistory(sysid, tg1, tg2, tag1, tag2, mode, src1, src2) {

	// appends the call history table only when the current call is not already there
	// or is older than 5 seconds.
	// called by trunk_update()

    const tableBody = document.getElementById("callHistoryBody");
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
    const epoch = now.getTime(); // current time in ms
    const sysHex = sysid.toString(16).toUpperCase().padStart(3, '0');
    const slot = "S"; // Placeholder for slot

    // Helper to check if a similar row already exists
    function isDuplicate(tgid) {
        const recentRows = tableBody.querySelectorAll("tr");
        for (let i = 0; i < Math.min(MAX_HISTORY_ROWS, recentRows.length); i++) {
            const cells = recentRows[i].querySelectorAll("td");
            if (cells.length < 5) continue;

            const rowTime = cells[0].textContent.trim();
            const rowSys  = cells[1].textContent.trim();
            const rowSlot = cells[2].textContent.trim();
            const rowTgid = cells[3].textContent.trim();

            if (rowSys === sysHex && rowTgid === String(tgid)) {
                const rowDate = new Date();
                rowDate.setHours(...rowTime.split(':'));
                const rowEpochSec = Math.floor(rowDate.getTime() / 1000);
                const nowSec = Math.floor(epoch / 1000);
                const delta = Math.abs(nowSec - rowEpochSec);
                return delta <= MAX_HISTORY_SECONDS;
            }
        }
        return false;
    }

    // Helper to add a row
    	// TODO: src
		function addRow(tgid, tag) {
			
// 			if (!src)
// 				src = " ";
		
		// TODO: clean this up -- it works, just need garbage collection
		
			// Only proceed if tgid is defined and its string length > 2
			if (tgid === undefined || String(tgid).length <= 2) return;
		
			const tgEntry = tag;

// 			const tgEntry = seenTalkgroups.find(entry =>
//     			entry.system === c_system && entry.tgid === Number(tgid)
// 			);
			
			const tgName = tgEntry;
			
// 			const tgName = tgEntry ? tgEntry.tag : `Talkgroup ${tgid}`;
		
			const newRow = document.createElement("tr");
			
			// TODO: src
			newRow.innerHTML = `
				<td>${timestamp}</td>
				<td>${sysHex}</td>
				<td>${mode}</td>
				<td>${tgid}</td>
				<td style="text-align: left;">${tgName}</td>
			`;
		
			tableBody.insertBefore(newRow, tableBody.firstChild);
		}

    // Process single or both entries
	if (tg1 !== undefined) {
		if (!isDuplicate(tg1)) {
			addRow(tg1, tag1, src1);
		}
	}
	
	if (tg2 !== undefined && tg2 !== tg1) {
		if (!isDuplicate(tg2)) {
			addRow(tg2, tag2, src2);
		}
	}
	
	applySmartColorsToCallHistory();
}

function applySmartColorsToCallHistory() {
  if (!document.getElementById("smartColorToggle").checked) return;

  const rows = document.querySelectorAll("#callHistoryBody tr");

  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 5) return;

    const tgidCell = cells[3];
    const sourceCell = cells[4];
    const cellText = sourceCell.textContent.toLowerCase();

    let matched = false;

    for (const colorGroup of smartColors) {
      if (colorGroup.keywords.some(keyword => cellText.includes(keyword.toLowerCase()))) {
        tgidCell.style.color = colorGroup.color;
        sourceCell.style.color = colorGroup.color;
        matched = true;
        break;
      }
    }

    if (!matched) {
      tgidCell.style.color = "";
      sourceCell.style.color = "";
    }
  });
}


function applySmartColorsToFrequencyTable() {
  if (!document.getElementById("smartColorToggle").checked) return;

  const rows = document.querySelectorAll("#frequencyTable tr");

  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 3) return;

    const talkgroupCells = [cells[2]];
    if (cells.length > 3 && cells[3].cellIndex === 3) {
      talkgroupCells.push(cells[3]);
    }

    talkgroupCells.forEach(cell => {
      const cellText = cell.textContent.toLowerCase();
      let matched = false;

      // Skip TDMA/FDMA mode cells
      if (cellText === "fdma" || cellText === "tdma") return;

      for (const colorGroup of smartColors) {
        if (colorGroup.keywords.some(keyword => cellText.includes(keyword.toLowerCase()))) {
          cell.style.color = colorGroup.color;
          matched = true;
          break;
        }
      }

      if (!matched) {
        cell.style.color = "";
      }
    });
  });
}


function applySmartColorToTgidSpan() {
  if (!document.getElementById("smartColorToggle").checked) return;

  const el = document.getElementById("displayTalkgroup");
  if (!el) return;

  const cellText = el.textContent.toLowerCase();

  for (const colorGroup of smartColors) {
    if (colorGroup.keywords.some(keyword => cellText.includes(keyword.toLowerCase()))) {
      el.style.color = colorGroup.color;
      return;
    }
  }

  el.style.color = "";
}

function saveSeenTalkgroups() {
	return;
    localStorage.setItem("seenTalkgroups", JSON.stringify(seenTalkgroups));
}

function loadSeenTalkgroups() {         // DEPRECATED
	return;  // DEPRECATED

	cleanStoredTalkgroups();

	// console.log(localStorage.getItem("seenTalkgroups"));

    const stored = localStorage.getItem("seenTalkgroups");
    if (stored) {
        try {
            seenTalkgroups = JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored talkgroups:", e);
            seenTalkgroups = [];
        }
    }
}

function cleanStoredTalkgroups() {

	return;  // not used now
// this just checks if there's garbage in the localStorage and cleans it up. 0 Control Channel for example.

    const stored = localStorage.getItem("seenTalkgroups");
    if (!stored) return;

    try {
        let tgList = JSON.parse(stored);

        // Filter out control channel entries
        tgList = tgList.filter(entry => {
            const isTgidZero = Number(entry.tgid) === 0;
            const isControl = typeof entry.tag === "string" && entry.tag.toLowerCase() === "control channel";
            return !isTgidZero && !isControl;
        });

        // Save the cleaned list back
        localStorage.setItem("seenTalkgroups", JSON.stringify(tgList));
        console.log("Cleaned seenTalkgroups — control channel entries removed.");

    } catch (err) {
        console.error("Error parsing or cleaning seenTalkgroups:", err);
    }
}

function getSiteAlias(sysid, rfss, site) {
	// as defined in config.js
  try {
    const alias = siteAliases?.[sysid]?.[rfss]?.[site]?.alias;
    return alias ?? `Site ${site}`;
  } catch (err) {
    console.warn("Error looking up site alias:", err);
    return `Site ${site}`;
  }
}

function toggleDivById(divId, buttonId) {
  const el = document.getElementById(divId);
  const btn = document.getElementById(buttonId);
  if (!el || !btn) return;

  const isVisible = el.style.display !== "none";

  if (isVisible) {
    el.style.display = "none";
    btn.style.color = ""; // reset to default
  } else {
    el.style.display = "";
    btn.style.color = "red";
  }
}

function updatePlotButtonStyles() {
  // First clear all button borders
  const buttonIds = ['fft', 'constellation', 'symbol', 'eye', 'mixer', 'fll'];
  buttonIds.forEach(type => {
    const btn = document.getElementById(`pb-${type}`);
    if (btn) btn.classList.remove("plot-active");
  });

  // Now check each image to see which plots are currently active
  for (let i = 0; i < 6; i++) {
    const img = document.getElementById(`img${i}`);
    if (!img || img.style.display === "none") continue;

    const src = img.getAttribute("src") || "";
    buttonIds.forEach(type => {
      if (src.includes(type)) {
        const btn = document.getElementById(`pb-${type}`);
        if (btn) btn.classList.add("plot-active");
      }
    });
  }
}

function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}

function handleColumnLayoutChange(e) {
  const secondCol = document.getElementById("second-column");
  if (!secondCol) return;

  if (e.matches) {
    // 2-column layout active
    secondCol.style.marginLeft = "10px";
  } else {
    // stacked layout (1 column)
    secondCol.style.marginLeft = "";
  }
}

function getTalkgroupNameFromCallHistory(tgid) {
  const rows = document.querySelectorAll("#callHistory tbody tr");

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 5) {
      const tgidText = cells[3].textContent.trim();
      if (tgidText === String(tgid)) {
        return cells[4].textContent.trim(); // Return talkgroup name
      }
    }
  }

  return null; // Not found
}

function saveSettingsToLocalStorage() {
  localStorage.setItem("callHeight", document.getElementById("callHeightControl").value);
  localStorage.setItem("plotWidth", document.getElementById("plotSizeControl").value);
  localStorage.setItem("smartColors", document.getElementById("smartColorToggle").checked);
  localStorage.setItem("adjacentSitesToggle", document.getElementById("adjacentSitesToggle").checked);

}

function loadSettingsFromLocalStorage() {
	const callHeight = localStorage.getItem("callHeight") || "600";
	const plotWidth = localStorage.getItem("plotWidth") || "300";
	const smartColors = localStorage.getItem("smartColors");
	const adjacentSites = localStorage.getItem("adjacentSitesToggle");
	
	// Apply call height
	document.getElementById("callHeightControl").value = callHeight;
	document.querySelector(".call-history-scroll").style.height = `${callHeight}px`;
	
	// Apply plot width
	document.getElementById("plotSizeControl").value = plotWidth;
	document.querySelectorAll(".plot-image").forEach(img => {
	img.style.width = `${plotWidth}px`;
	});
	
	// Apply smart color toggle (default = true)
	const smartColorEnabled = smartColors === null ? true : smartColors === "true";
	document.getElementById("smartColorToggle").checked = smartColorEnabled;
	
	// Apply adjacent sites toggle (default = true)
	const adjacentSitesEnabled = adjacentSites === null ? true : adjacentSites === "true";
	document.getElementById("adjacentSitesToggle").checked = adjacentSitesEnabled;
 
	const adjacentSitesContainer = document.getElementById("adjacentSitesContainer");
	if (adjacentSitesContainer) {
	  adjacentSitesContainer.style.display = adjacentSitesEnabled ? "" : "none";
	}
  
}

function showHome() {
  const settings = document.getElementById("settings-container");
  const about = document.getElementById("about-container");

  if (settings) settings.style.display = "none";
  if (about) about.style.display = "none";

  const btnSettings = document.getElementById("btn-settings");
  const btnAbout = document.getElementById("btn-about");

  if (btnSettings) btnSettings.style.color = "";
  if (btnAbout) btnAbout.style.color = "";
}

function hex(val) {
  return val.toString(16).toUpperCase();
}
