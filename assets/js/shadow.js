var breakpoint = 906;

function invalid(el, valid) {
    if(valid === true)
        el.css("background", "").css("color", "");
    else
        el.css("background", "#E51C39").css("color", "white");

    return (valid == true);
}

function getAddressForNewChat(pubkey) {
    // if new-contact-address is empty get the address from the pubkey
    var address = $("#new-contact-address").val();
    if (address.length > 0)
        return address;

    address = bridge.addressForPubKey(pubkey);

    if (address.length > 0) {
        $("#new-contact-address").val(address);
        var label = getContactUsername(address, true);
        if (label == '(no label)')
            label = '';
        $('#new-contact-name').val(label);
    }

    return address;
}

function updateValue(element) {
    //TODO: add prefix label group_ when addresstype AT = 4. So we can remove it from the label being shown and handle it in the background..
    var curhtml = element.html(),
        value   = (element.parent("td").data("label") !== undefined ? element.parent("td").data("label") :
                  (element.parent("td").data("value") !== undefined ? element.parent("td").data("value") :
                  (element             .data("label") !== undefined ? element             .data("label") :
                  (element             .data("value") !== undefined ? element             .data("value") : element.text())))),

        address = element.parents(".selected").find(".address"),
        addresstype = element.parents(".selected").find(".addresstype");

    address = address.data("value") ? address.data("value") : address.text();

    if (addresstype.length === 1)
        addresstype = addresstype.data("value") ? addresstype.data("value") : addresstype.text();

    if(addresstype === "Group")
        value.replace("group_", "");

    element.html('<input class="newval" type="text" onchange="bridge.updateAddressLabel(\'' + address + '\', this.value);" value="' + value + '" size=60 />'); //

    function leave(e) {
        var newval = $(".newval");

        if (newval.length === 0)
            return;

        element.html(curhtml.replace(value, newval.val().trim()));
    }

    $(".newval").focus()
        .on("contextmenu", function(e) {
            e.stopPropagation();
        })
        .keyup(function (event) {
            if (event.keyCode == 13)
                leave(event);
        });

    $(document).one('click', leave);
}


function updateValueChat(element, key) {
    var value = element.data("value");
    var contact = contacts[key];

    if(contact == undefined)
        return false;

    element.html('<input class="new_chat_value" type="text" onchange="bridge.updateAddressLabel(\'' + contact.address + '\', this.value);" value="' + value + '" size=35 style="display:inline;" />'); //

    $("#chat-header .new_chat_value").focus();
    $("#chat-header .new_chat_value").on("contextmenu", function(e) {
        e.stopPropagation();
    });

    $("#chat-header .new_chat_value").keypress(function (event) {
        if (event.which == 13) {
            event.preventDefault();

            var localChatheader = $("#chat-header .new_chat_value");
            if(localChatheader == undefined || localChatheader.val() === undefined)
                return false;

            var newval = localChatheader.val().trim();

            if(newval == undefined)
                return false;


            if (newval.length === 0)
                return false;

            element.html(newval);
            contacts[current_key].label = newval;
            $("#chat-header").data("value", newval);
            $("#contact-" + current_key + " .contact-info .contact-name").text(newval);
            $("#contact-book-" + current_key + " .contact-info .contact-name").text(newval);
        }
    });

    $("#chat-header .new_chat_value").click(function(event) {
        event.stopPropagation();
    });

    $(document).one('click', function () {
        var localChatheader = $("#chat-header .new_chat_value");
        if(typeof localChatheader === undefined || localChatheader.val() === undefined)
            return false;

        var newval = localChatheader.val().trim();

        if(newval == undefined)
            return false;

        element.html(newval);
        contacts[current_key].label = newval;
        $("#chat-header").data("value", newval);
        $("#contact-" + current_key + " .contact-info .contact-name").text(newval);
        $("#contact-book-" + current_key + " .contact-info .contact-name").text(newval);
    });
}

$(function() {
    $('.footable,.footable-lookup').footable({breakpoints:{phone:480, tablet:700}, delay: 50})
    .on({'footable_breakpoint': function() {
            //$('table').trigger('footable_expand_first_row'); uncomment if we want the first row to auto-expand
        },
        'footable_row_expanded': function(event) {
        var editable = $(this).find(".editable");

        editable.off("dblclick").on("dblclick", function (event) {
           event.stopPropagation();
           updateValue($(this));
        }).attr("data-title", "Double click to edit").tooltip();
    }});

    $(".editable").on("dblclick", function (event) {
       event.stopPropagation();
       updateValue($(this));
    }).attr("data-title", "Double click to edit %column%");

    //$('img,i').click(function(e){e.stopPropagation()});

    // On resize, close menu when it gets to the breakpoint
    window.onresize = function (event) {
        if (window.innerWidth > breakpoint)
            $("#layout").removeClass('active');
    };

    if(bridge)
        $("[href='#about']").on("click", function() {bridge.userAction(['aboutClicked'])});

    overviewPage.init();
    receivePageInit();
    transactionPageInit();
    addressBookInit();
    shadowChatInit();
    chainDataPage.init();
    walletManagementPage.init();

    // Initialise row selection
    $(".footable > tbody tr").selection();
});

// Row select function
$.fn.selection = function(sibling) {
    if (!sibling)
        sibling = "tr";

    return this.on('click', function() {
        $(this)
            .addClass("selected")
        .siblings(sibling)
            .removeClass("selected");
    });
}

// Connect to bridge signals
function connectSignals() {
    bridge.emitPaste.connect(this, pasteValue);

    bridge.emitTransactions.connect(this, appendTransactions);
    bridge.emitAddresses.connect(this, appendAddresses);
    bridge.emitMessages.connect(this, appendMessages);
    bridge.emitMessage.connect(this,  appendMessage);

    bridge.emitCoinControlUpdate.connect(sendPage, "updateCoinControlInfo");

    bridge.triggerElement.connect(this, triggerElement);

    bridge.emitReceipient.connect(sendPage, "addRecipientDetail");
    bridge.networkAlert.connect(this, networkAlert);

    optionsModel.displayUnitChanged.connect(unit, "setType");
    optionsModel.reserveBalanceChanged.connect(overviewPage, "updateReserved");
    optionsModel.rowsPerPageChanged.connect(this, "updateRowsPerPage");
    optionsModel.visibleTransactionsChanged.connect(this, "visibleTransactions");

    walletModel.encryptionStatusChanged.connect(overviewPage, "encryptionStatusChanged");
    walletModel.balanceChanged.connect(overviewPage, "updateBalance");

    overviewPage.clientInfo();
    optionsPage.update();
    chainDataPage.updateAnonOutputs();
    translateStrings();
}

function triggerElement(el, trigger) {
    $(el).trigger(trigger);
}

function updateRowsPerPage(rows) {
    $(".footable").each(function() {
        var table = $(this);

        if (table.hasClass('footable-lookup'))
            return;

        table.data().pageSize = rows;
        table.trigger('footable_initialize');
    });
}

var base58 = {
    base58Chars :"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",

    check: function(field)
    {
        var el = $(field);
        var value = el.val();

        for (var i = 0, len = value.length; i < len; ++i)
            if (base58.base58Chars.indexOf(value[i]) == -1) {
                el.css("background", "#E51C39").css("color", "white");
                return false;
            }

        el.css("background", "").css("color", "");
        return true;
    }
}

var pasteTo = "";

function pasteValue(value) {
    $(pasteTo).val(value);
}

function paste(field)
{
    pasteTo = field;
    bridge.paste();
    if (pasteTo.indexOf("#pay_to") == 0
        || pasteTo == '#change_address')
        base58.check(pasteTo);
}

function copy(field, attribute)
{
    var value = '';

    try {
        value = $(field).text();
    } catch(e) {};

    if(value==undefined||attribute!=undefined)
    {
        if(attribute=='copy')
            value = field;
        else
            value = $(field).attr(attribute);
    }

    bridge.copy(value);
}

function networkAlert(alert) {
    $("#network-alert span").text(alert).toggle(alert !== "");
}

var unit = {
    type: 0,
    name: "SDC",
    display: "SDC",
    setType: function(type) {
        this.type = (type == undefined ? 0 : type);

        switch(type) {
            case 1:
                this.name = "mSDC",
                this.display = "mSDC";
                break;

            case 2:
                this.name = "uSDC",
                this.display = "&micro;SDC";
                break;

            case 3:
                this.name    = "sSDC",
                this.display = "Shadowshi";
                break;

            default:
                this.name = this.display = "SDC";
        }

        $("td.unit,span.unit,div.unit").html(this.display);
        $("select.unit").val(type).trigger("change");
        $("input.unit").val(this.name);
        overviewPage.updateBalance();
    },
    format: function(value, type) {
        var el = ($.isNumeric(value) ? null : $(value));

        type  = (type == undefined ? this.type : parseInt(type)),
        value = parseInt(el == undefined ? value : (el.data('value') == undefined ? el.val() : el.data('value')));

        switch(type) {
            case 1: value = value / 100000; break;
            case 2: value = value / 100; break;
            case 3: break;
            default: value = value / 100000000;
        }

        value = value.toFixed(this.mask(type));

        if(el == undefined)
            return value;

        el.val(value);
    },
    parse: function(value, type) {
        var el = ($.isNumeric(value) ? null : $(value));

        type  = (type == undefined ? this.type : parseInt(type)),

        fp = (el == undefined ? value : el.val());
        if (fp == undefined || fp.length < 1)
            fp = ['0', '0'];
        else
        if (fp[0] == '.')
            fp = ['0', fp.slice(1)];
        else
            fp = fp.split('.');

        value = parseInt(fp[0]);

        var ipow = this.mask(type);
        if (ipow > 0)
            value *= Math.pow(10, ipow);
        if (ipow > 0 && fp.length > 1)
        {
            var av = fp[1].split('');

            while (av.length > 1 && av[av.length-1] == '0')
                av.pop();

            var fract = parseInt(av.join(''));

            if (fract > 0)
            {
                ipow -= av.length;

                if (ipow > 0)
                    fract = fract * Math.pow(10, ipow);
                value += fract
            };
        };

        if (el == undefined)
            return value;

        el.data('value', value);
        this.format(el, type);
    },
    mask: function(type) {
        type  = (type == undefined ? this.type : parseInt(type));

        switch(type) {
            case 1: return 5;
            case 2: return 2;
            case 3: return 0;
            default:return 8;
        }
    },
    keydown: function(e) {
        var key = e.which,
            type = $(e.target).siblings(".unit").val();


        if(key==190 || key == 110) {
            if(this.value.toString().indexOf('.') !== -1 || unit.mask(type) == 0)
                e.preventDefault();

            return true;
        }

        if(!e.shiftKey && (key>=96 && key<=105 || key>=48 && key<=57)) {
            var selectS = this.selectionStart;
            var indP = this.value.indexOf(".");
            if (!(document.getSelection().type === "Range") && selectS > indP && this.value.indexOf('.') !== -1 && this.value.length -1 - indP >= unit.mask(type))
            {
                if (this.value[this.value.length-1] == '0'
                    && selectS < this.value.length)
                {
                    this.value = this.value.slice(0,-1);
                    this.selectionStart = selectS;
                    this.selectionEnd = selectS;
                    return;
                }
                e.preventDefault();
            }
            return;
        }

        if(key==8||key==9||key == 17||key==46||key==45||key>=35 && key<=40||(e.ctrlKey && (key==65||key==67||key==86||key==88)))
            return;

        e.preventDefault();
    },
    paste: function(e) {
        var data = e.originalEvent.clipboardData.getData("text/plain");
        if(!($.isNumeric(data)) || (this.value.indexOf('.') !== -1 && document.getSelection().type !== "Range"))
            e.preventDefault();
    }
};

var contextMenus = [];
function openContextMenu(el)
{
    if (contextMenus.indexOf(el) === -1)
        contextMenus.push(el);

    if (el.isOpen !== undefined && el.isOpen === 1) {
        el.isOpen = 0;
        if(el.close)
            el.close();
    }

    // -- close other menus (their onClose isn't called if they were closed by opening another memu)
    for (var i = 0; i < contextMenus.length; ++i)
        contextMenus[i].isOpen = contextMenus[i] == el ? 1 : 0;
}

/* Overview Page */
var overviewPage = {
    init: function() {
        this.balance = $(".balance"),
        this.shadowBal = $(".shadow_balance"),
        this.reserved = $("#reserved"),
        this.stake = $("#stake"),
        this.unconfirmed = $("#unconfirmed"),
        this.immature = $("#immature"),
        this.total = $("#total");
    },

    updateBalance: function(balance, shadowBal, stake, unconfirmed, immature) {
        if(balance == undefined)
            balance     = this.balance    .data("orig"),
            shadowBal   = this.shadowBal  .data("orig"),
            stake       = this.stake      .data("orig"),
            unconfirmed = this.unconfirmed.data("orig"),
            immature    = this.immature   .data("orig");
        else
            this.balance    .data("orig", balance),
            this.shadowBal  .data("orig", shadowBal),
            this.stake      .data("orig", stake),
            this.unconfirmed.data("orig", unconfirmed),
            this.immature   .data("orig", immature);

        this.formatValue("balance",     balance);
        this.formatValue("shadowBal",   shadowBal);
        this.formatValue("stake",       stake);
        this.formatValue("unconfirmed", unconfirmed);
        this.formatValue("immature",    immature);
        this.formatValue("total", balance + stake + unconfirmed + immature + shadowBal);
    },

    updateReserved: function(reserved) {
        this.formatValue("reserved", reserved);
    },

    formatValue: function(field, value) {

        if(field === "total" && value !== undefined && !isNaN(value))
        {
            var val = unit.format(value).split(".");

            $("#total-big > span:first-child").text(val[0]);
            $("#total-big .cents").text(val[1]);
        }

        if(field === "stake" && value !== undefined && !isNaN(value))
        {
            if(value == 0)
                $("#staking-big").addClass("not-staking");
            else
                $("#staking-big").removeClass("not-staking");

            var val = unit.format(value).split(".");

            $("#staking-big > span:first-child").text(val[0]);
            $("#staking-big .cents").text(val[1]);
        }

        field = this[field];

        if(value == 0) {
            field.html("");
            field.parent("tr").hide();
        } else {
            field.text(unit.format(value));
            field.parent("tr").show();
        }
    },
    recent: function(transactions) {
        for(var i = 0;i < transactions.length;i++)
            overviewPage.updateTransaction(transactions[i]);

        $("#recenttxns [data-title]").tooltip();
    },
    updateTransaction: function(txn) {
        var format = function(tx) {
            return "<tr><td class='text-left' style='border-top: 1px solid rgba(230, 230, 230, 0.7);border-bottom: none;'><center><label style='margin-top:6px;' class='label label-important inline fs-12'>"+(tx.t == 'input' ? 'Received' : (tx.t == 'output' ? 'Sent' : (tx.t == 'inout' ? 'In-Out' : 'Stake')))+"</label></center></td><td class='text-left' style='border-top: 1px solid rgba(230, 230, 230, 0.7);border-bottom: none;'><center><a id='"+tx.id.substring(0,17)+"' data-title='"+tx.tt+"' href='#' onclick='$(\"#navitems [href=#transactions]\").click();$(\"#"+tx.id+"\").click();'> "
              +unit.format(tx.am)+" "+unit.display+" </a></center></td><td style='border-top: 1px solid rgba(230, 230, 230, 0.7);border-bottom: none;'><span class='overview_date' data-value='"+tx.d+"'><center>"+tx.d_s+"</center></span></td></tr>";
        }

 var sid = txn.id.substring(0,17);

        if($("#"+sid).attr("data-title", txn.tt).length==0)
        {
            var set = $('#recenttxns tr');
            var txnHtml = format(txn);

            var appended = false;

            for(var i = 0; i<set.length;i++)
            {
                var el = $(set[i]);

                if (parseInt(txn.d) > parseInt(el.find('.overview_date').data("value")))
                {
                    el.before(txnHtml);
                    appended = true;
                    break;
                }
            }

            if(!appended)
                $("#recenttxns").append(txnHtml);

            set = $('#recenttxns tr');

            while(set.length > 8)
            {
                $("#recenttxns tr:last").remove();

                set = $('#recenttxns tr');
            }
        }
    },
    clientInfo: function() {
        $('#version').text(bridge.info.build.replace(/\-[\w\d]*$/, ''));
        $('#clientinfo').attr('data-title', 'Build Desc: ' + bridge.info.build + '\nBuild Date: ' + bridge.info.date).tooltip();
    },
    encryptionStatusChanged: function(status) {
        switch(status)
        {
        case 0: // Not Encrypted
        case 1: // Unlocked
        case 2: // Locked
        }
    }
}

var optionsPage = {
    init: function() {
    },

    update: function() {
        var options = bridge.info.options;
        $("#options-ok,#options-apply").addClass("disabled");

        for(var option in options)
        {
            var element = $("#opt"+option),
                value   = options[option],
                values  = options["opt"+option];

            if(element.length == 0)
            {
                if(option.indexOf('opt') == -1)
                    console.log('Option element not available for %s', option);

                continue;
            }

            if(values)
            {
                element.html("");

                for(var prop in values)
                    if(typeof prop === "string" && $.isArray(values[prop]) && !$.isNumeric(prop)) {
                        element.append("<optgroup label='"+prop[0].toUpperCase() + prop.slice(1)+"'>");

                        for(var i=0;i<values[prop].length;i++)
                            element.append("<option>" + values[prop][i] + "</option>");
                    } else
                        element.append("<option" + ($.isNumeric(prop) ? '' : " value='"+prop+"'") + ">" + values[prop] + "</option>");
            }

            function toggleLinked(el) {
                el = $(this);
                var enabled = el.prop("checked"),
                    linked = el.data("linked");

                if(linked)
                    linked = linked.split(" ");
                else
                    return;

                for(var i=0;i<linked.length;i++)
                {
                    var linkedElements = $("#"+linked[i]+",[for="+linked[i]+"]").attr("disabled", !enabled);
                    if(enabled)
                        linkedElements.removeClass("disabled");
                    else
                        linkedElements.addClass("disabled");
                }
            }

            if(element.is(":checkbox"))
            {
                element.prop("checked", value === true||value === "true");
                element.off("change");
                element.on("change", toggleLinked);
                element.change();
            }
            else if(element.is("select[multiple]") && value === "*")
                element.find("option").attr("selected", true);
            else
                element.val(value);

            element.one("change", function() {$("#options-ok,#options-apply").removeClass("disabled");});
        }
    },
    save: function() {
        var options = bridge.info.options,
            changed = {};

        for(var option in options)
        {
            var element  = $("#opt"+option),
                oldvalue = options[option],
                newvalue = false;

            if(oldvalue == null || oldvalue == "false")
                oldvalue = false;

            if(element.length == 0)
                continue;

            if(element.is(":checkbox"))
                newvalue = element.prop("checked");
            else if(element.is("select[multiple]")) {
                newvalue = element.val();
                if (newvalue === null)
                    newvalue = "*";
            } else
                newvalue = element.val();

            if(oldvalue != newvalue && oldvalue.toString() !== newvalue.toString())
                changed[option] = newvalue;
        }

        if(!$.isEmptyObject(changed))
        {
            bridge.userAction({'optionsChanged': changed});
            optionsPage.update();

            if(changed.hasOwnProperty('AutoRingSize'))
                changeTxnType();
        }
    }
}

function receivePageInit() {
    var menu = [{
            name: 'Copy&nbsp;Address',
            fun: function () {
                copy('#receive .footable .selected .address');
            }
        },
        {
            name: 'Copy&nbsp;Label',
            fun: function () {
                copy('#receive .footable .selected .label2');
            }
        },
        {
            name: 'Copy&nbsp;Public&nbsp;Key',
            fun: function () {
                copy('#receive .footable .selected .pubkey');
            }
        },
        {
            name: 'Edit',
            fun: function () {
                $("#receive .footable .selected .label2.editable").dblclick();
            }
        }];

    //Calling context menu
     $('#receive .footable tbody').on('contextmenu', function(e) {
        $(e.target).closest('tr').click();
     }).contextMenu(menu, {triggerOn:'contextmenu', sizeStyle: 'content'});

    // Deal with the receive table filtering
    // On any input update the filter
    $('#filter-address').on('input', function () {
        var receiveTable =  $('#receive-table');

        if($('#filter-address').val() === "")
        {
            receiveTable.data('footable-filter').clearFilter();
        }
        $('#receive-filter').val($('#filter-address').val() + " " + $('#filter-addresstype').val() ) ;
        receiveTable.trigger('footable_filter', {filter: $('#receive-filter').val()});
    });

    $('#filter-addresstype').change(function () {
        var receiveTable =  $('#receive-table');
        if($('#filter-addresstype').val() === "")
        {
            receiveTable.data('footable-filter').clearFilter();
        }
        $('#receive-filter').val($('#filter-address').val() + " " + $('#filter-addresstype').val() ) ;
        receiveTable.trigger('footable_filter', {filter: $('#receive-filter').val()});
    });
}

function clearRecvAddress()
{
    $("#new-address-label").val('');
    $("#new-addresstype").val(1);
}

function addAddress()
{
    var addresstype = $("#new-addresstype").val();
    var addresslabel = (addresstype == "4") ? "group_" + $("#new-address-label").val() : $("#new-address-label").val();

    newAdd = bridge.newAddress(addresslabel, addresstype);

    //TODO: Highlight address
    //$("#add-address-modal .modal_close").click();
    $('#add-address-modal').modal('hide');
}

function clearSendAddress()
{
    $("#new-send-label").val('');
    $("#new-send-address").val('');
    $("#new-send-address-error").text('');
    $("#new-send-address").removeClass('inputError');
}

function addSendAddress()
{
    var sendLabel, sendAddress, currentLabel, result;
    sendLabel   =  $("#new-send-label").val();
    sendAddress = $("#new-send-address").val();


    currentLabel = bridge.getAddressLabel(sendAddress);

    if(currentLabel !== "") {
        $("#new-send-address-error").text("Error: address already in addressbook under \"" +  currentLabel + "\"");
        $("#new-send-address").addClass('inputError');

        return;
    }
    result = addSendAddressBackend(sendLabel, sendAddress);
    if (result === "")
    {
        var errorMsg = bridge.lastAddressError();
        $("#new-send-address-error").text("Error: " + errorMsg);
        $("#new-send-address").addClass('inputError');
    } else {
        updateContact(sendLabel, sendAddress, sendAddress, false);
        $('#add-address-modal').modal('hide');
    }
}

function addSendAddressBackend(arg_sendLabel, arg_sendAddress){
    return bridge.newAddress(arg_sendLabel, 0, arg_sendAddress, true);

}

function addressBookInit() {
    var menu = [{
            name: 'Copy&nbsp;Address',
            fun: function () {
                copy('#addressbook .footable .selected .address');
            }
        },
        {
            name: 'Copy&nbsp;Public&nbsp;Key',
            fun: function () {
                copy('#addressbook .footable .selected .pubkey');
            }
        },
        {
            name: 'Copy&nbsp;Label',
            fun: function () {
                copy('#addressbook .footable .selected .label2');
            }
        },
        {
            name: 'Edit',
            fun: function () {
                $("#addressbook .footable .selected .label2.editable").dblclick();
            }
        },
        {
            name: 'Delete',
            fun: function () {
                var addr=$('#addressbook .footable .selected .address');
                if(bridge.deleteAddress(addr.text()))
                    addr.closest('tr').remove();
            }
        }];

    //Calling context menu
     $('#addressbook .footable tbody').on('contextmenu', function(e) {
        $(e.target).closest('tr').click();
     }).contextMenu(menu, {triggerOn:'contextmenu', sizeStyle: 'content'});

    // Deal with the addressbook table filtering
    // On any input update the filter
    $('#filter-addressbook').on('input', function () {
        var addressbookTable =  $('#addressbook-table');

        if($('#filter-addressbook').val() == "")
        {
            addressbookTable.data('footable-filter').clearFilter();
        }
        $('#addressbook-filter').val($('#filter-addressbook').val() + " " + $('#filter-addressbooktype').val() ) ;
        addressbookTable.trigger('footable_filter', {filter: $('#addressbook-filter').val()});
    });

    $('#filter-addressbooktype').change(function () {
        var addressbookTable =  $('#addressbook-table');
        if($('#filter-addresstype').val() == "")
        {
            addressbookTable.data('footable-filter').clearFilter();
        }
        $('#addressbook-filter').val($('#filter-addressbook').val() + " " + $('#filter-addressbooktype').val() ) ;
        addressbookTable.trigger('footable_filter', {filter: $('#addressbook-filter').val()});
    });
}


var Name = 'You';
var initialAddress = true;

function appendAddresses(addresses) {
    if(typeof addresses == "string")
    {
        if(addresses == "[]")
            return;

        addresses = JSON.parse(addresses.replace(/,\]$/, "]"));
    }

    /* Initialize part of chat */
    contact_book_list = $("#contact-book-list ul");

    addresses.forEach(function(address) {
        var addrRow = $("#"+address.address);
        var page = (address.type == "S" ? "#addressbook" : (address.label.lastIndexOf("group_", 0) !== 0 ? "#receive" : "#addressbook"));
        var addrRowInviteModal = $("#invite-modal-"+address.address);
        var addrRowGroupModal = $("#invite-modal-"+address.address);

        /* add address to chat dropdown box to choose sender from */
        if(address.type == "R" && sendPage.initSendBalance(address) && address.address.length < 75 && address.label.lastIndexOf("group_", 0) !== 0) {
            if (addrRow.length==0)
                $("#message-from-address").append("<option title='"+address.address+"' value='"+address.address+"'>"+address.label+"</option>");
            else
                $("#message-from-address option[value="+address.address+"]").text(address.label);

            if (initialAddress) {
                $("#message-from-address").prepend("<option title='Anonymous' value='anon' selected>Anonymous</option>");
                $(".user-name")   .text(Name);
                $(".user-address").text(address.address);
                initialAddress = false;
            }
        }

        /* remove group_ prefix from labels*/
        var isGroup = (address.at == 4 || address.label.lastIndexOf("group_", 0) === 0);
        var isSend = (address.type == "S");
        if (isGroup) {
            address.at = 4; //lastIndexOf..
            address.label = address.label.replace("group_", "");
            address.label_value = address.label_value.replace("group_", "");
            isSend = true;
        }

        var bHasPubKey = (address.pubkey !== "n/a" ? true : false);

        if (isSend && bHasPubKey) {
            createContact(address.label, address.address, isGroup, true);
            appendContact(address.address, false, true);
         }

        //console.log("adding address " + address.address + " label=" + address.label + " isGroup=" + isGroup + " isSend=" + isSend + " bHasPubKey=" + bHasPubKey );

        /* Fill up addressbook "BOOK" in invite modal  */
         if(!isGroup && isSend && bHasPubKey) {

            // (1) append address to table of invite modal
            if (addrRowInviteModal.length==0) {

                var dataToAppend = 
                    "<tr id='invite-modal-"+address.address+"' lbl='"+address.label+"'>\
                   <td style='padding-left:18px;' class='label2' data-value='"+address.label_value+"'>"+address.label+"</td>\
                   <td class='address'>"+address.address+"</td>\
                   <td class='invite footable-visible footable-last-column'><input type='checkbox' class='checkbox'></input></td>\
                   </tr>";

                $( "#invite-modal-tbody").append(dataToAppend);
            }
            else {
                $("#invite-modal-"+address.address+" .label2").text(address.label);
            }

            // (2) append address to table of new group modal
            if (addrRowGroupModal.length==0) {

                var dataToAppend = 
                    "<tr  id='group-modal-"+address.address+"' lbl='"+address.label+"'>\
                   <td style='padding-left:18px;' class='label2' data-value='"+address.label_value+"'>"+address.label+"</td>\
                   <td class='address'>"+address.address+"</td>\
                   <td class='invite footable-visible footable-last-column'><input type='checkbox' class='checkbox'></input></td>\
                   </tr>";

                $( "#group-modal-tbody").append(dataToAppend);
            }
            else {
                $("#group-modal-"+address.address+" .label2").text(address.label);
            }
         }


        if (addrRow.length==0) {
            $(page + " .footable tbody").append(
                "<tr id='"+address.address+"' lbl='"+address.label+"'>\
                 <td style='padding-left:18px;' class='label2 editable' data-value='"+address.label_value+"'>"+address.label+"</td>\
                 <td class='address'>"+address.address+"</td>\
                 <td class='pubkey'>"+address.pubkey+"</td>\
                 <td class='addresstype'>"+(address.at == 4 ? "Group" : address.at == 3 ? "BIP32" : address.at == 2 ? "Stealth" : "Normal")+"</td></tr>");

            $("#"+address.address)
                .selection('tr')
                .find(".editable").on("dblclick", function (event) {
                    event.stopPropagation();
                    updateValue($(this));
                }).attr("data-title", "Double click to edit")
        .tooltip();
        }
        else
        {
            $("#"+address.address+" .label2").data("value", address.label_value).text(address.label);
            $("#"+address.address+" .pubkey").text(address.pubkey);
        }
    });

    var table = $('#addressbook .footable,#receive .footable').trigger("footable_setup_paging");
}

function addressLookup(returnFields, receive, filterType)
{
    var lookupData = $((receive ? '#receive' : '#addressbook') + ' table.footable > tbody').html(),
        lookupTable = $("#address-lookup-table");

    lookupTable.children('tbody').html(lookupData);
    lookupTable.trigger('footable_initialize');
    lookupTable.data('footable-filter').clearFilter();

    $("#address-lookup-table > tbody tr")
        .selection()
        .on('dblclick', function() {
            var retfields = returnFields.split(',');
            $("#" + retfields[0]).val( $(this).attr("id").trim() ).change();
            if(retfields[1] !== undefined )
            {
                $("#" + retfields[1])
                    .val($(this).attr("lbl").trim())
                    .text($(this).attr("lbl").trim())
                    .change();
            }
            $('#address-lookup-modal').modal('hide');
        });

    function doFilter() {
        $('#address-lookup-filter').val($('#address-lookup-address-filter').val() + " " + $('#address-lookup-address-type').val() ) ;
        lookupTable.trigger('footable_filter', {filter: $('#address-lookup-filter').val()});
    }

    // Deal with the lookup table filtering
    // On any input update the filter
    $('#address-lookup-address-filter').on('input', function () {
        if($('#lookup-address-filter').val() == "")
            lookupTable.data('footable-filter').clearFilter();

        doFilter();
    });

    $('#address-lookup-address-type').change(function () {
        if($('#address-lookup-address-type').val() == "")
            lookupTable.data('footable-filter').clearFilter();

        doFilter();
    });

    if (filterType) {
        $('#address-lookup-address-type').val(filterType);
        doFilter();
    }
}

function transactionPageInit() {
    var menu = [{
            name: 'Copy&nbsp;Amount',
            fun: function () {
                copy('#transactions .footable .selected .amount', "data-value");
            }
        },
        {
            name: 'Copy&nbsp;transaction&nbsp;ID',
            fun: function () {
                copy('#transactions .footable .selected', "id");
            }
        },
        {
            name: 'Edit&nbsp;label',
            fun: function () {
                $("#transactions .footable .selected .editable").dblclick();
            }
        },
        {
            name: 'Show&nbsp;transaction&nbsp;details',
            fun: function () {
                $("#transactions .footable .selected").dblclick();
            }
        }];

    //Calling context menu
     $('#transactions .footable tbody').on('contextmenu', function(e) {
        $(e.target).closest('tr').click();
     }).contextMenu(menu, {triggerOn:'contextmenu', sizeStyle: 'content'});

    $('#transactions .footable').on("footable_paging", function(e) {
        var transactions = filteredTransactions.slice(e.page * e.size)
            transactions = transactions.slice(0, e.size);

        var $tbody = $("#transactions .footable tbody");

        $tbody.html("");

        delete e.ft.pageInfo.pages[e.page];

        e.ft.pageInfo.pages[e.page] = transactions.map(function(val) {
            val.html = formatTransaction(val);

            $tbody.append(val.html);

            return $("#"+val.id)[0];

        });
        e.result = true;

        bindTransactionTableEvents();

    }).on("footable_create_pages", function(e) {
        var $txtable = $("#transactions .footable");
        if(!$($txtable.data("filter")).val())
            filteredTransactions = Transactions;

        /* Sort Columns */
        var sortCol = $txtable.data("sorted"),
            sortAsc = $txtable.find("th.footable-sorted").length == 1,
            sortFun = 'numeric';

        switch(sortCol)
        {
        case 0:
            sortCol = 'd';
            break;
        case 2:
            sortCol = 't_l',
            sortFun = 'alpha';
            break;
        case 3:
            sortCol = 'ad',
            sortFun = 'alpha';
            break;
        case 4:
            sortCol = 'n',
            sortFun = 'alpha';
            break;
        case 5:
            sortCol = 'am';
            break;
        default:
            sortCol = 'c';
            break;
        }

        sortFun = e.ft.options.sorters[sortFun];

        filteredTransactions.sort(function(a, b) {
            return sortAsc ? sortFun(a[sortCol], b[sortCol]) : sortFun(b[sortCol], a[sortCol]);
        });
        /* End - Sort Columns */

        /* Add pages */
        delete e.ft.pageInfo.pages;
        e.ft.pageInfo.pages = [];
        var addPages = Math.ceil(filteredTransactions.length / e.ft.pageInfo.pageSize),
            newPage  = [];

        if(addPages > 0)
        {
            for(var i=0;i<e.ft.pageInfo.pageSize;i++)
                newPage.push([]);

            for(var i=0;i<addPages;i++)
                e.ft.pageInfo.pages.push(newPage);
        }

        /* End - Add pages */
    }).on("footable_filtering", function(e) {
        if(e.clear)
            return true;

        filteredTransactions = Transactions.filter(function(transaction) {
            for(var prop in transaction)
                if(transaction[prop].toString().toLowerCase().indexOf(e.filter.toLowerCase()) !== -1)
                    return true;

            return false;
        });
    });
}


var Transactions = [],
    filteredTransactions = [];

function formatTransaction(transaction) {
    return "<tr id='"+transaction.id+"' data-title='"+transaction.tt+"'>\
                    <td data-value='"+transaction.d+"'>"+transaction.d_s+"</td>\
                    <td class='trans-status' data-value='"+transaction.c+"'><center><i class='fa fa-lg "+transaction.s+"'></center></td>\
                    <td class='trans_type'><img height='15' width='15' src='assets/icons/tx_"+transaction.t+".png' /> "+transaction.t_l+"</td>\
                    <td class='address' style='color:"+transaction.a_c+";' data-value='"+transaction.ad+"' data-label='"+transaction.ad_l+"'><span class='editable'>"+transaction.ad_d+"</span></td>\
                    <td class='trans-nar'>"+transaction.n+"</td>\
                    <td class='amount' style='color:"+transaction.am_c+";' data-value='"+transaction.am_d+"'>"+transaction.am_d+"</td>\
                 </tr>";
}

function visibleTransactions(visible) {
    if(visible[0] !== "*")
        Transactions = Transactions.filter(function(val) {
            return this.some(function(val){return val == this}, val.t_l);
        }, visible);
}

function bindTransactionTableEvents() {

    $("#transactions .footable tbody tr")
    .tooltip()

    .on('click', function() {
        $(this).addClass("selected").siblings("tr").removeClass("selected");
    })

    .on("dblclick", function(e) {
        $(this).attr("href", "#transaction-info-modal");

        $('#transaction-info-modal').appendTo("body").modal('show');

        $("#transaction-info").html(bridge.transactionDetails($(this).attr("id")));
        $(this).click();

        $(this).off('click');
        $(this).on('click', function() {
                $(this).addClass("selected").siblings("tr").removeClass("selected");
        })
    }).find(".editable")

   .on("dblclick", function (event) {
      event.stopPropagation();
      event.preventDefault();
      updateValue($(this));
   }).attr("data-title", "Double click to edit").tooltip();
}

function appendTransactions(transactions) {
    if(typeof transactions == "string")
    {
        if(transactions == "[]")
            return;

        transactions = JSON.parse(transactions.replace(/,\]$/, "]"));
    }

    if(transactions.length==1 && transactions[0].id==-1)
        return;

    transactions.sort(function (a, b) {
        a.d = parseInt(a.d);
        b.d = parseInt(b.d);

        return b.d - a.d;
    });

    Transactions = Transactions.filter(function(val) {
        return this.some(function(val) {
            return val.id == this.id;
        }, val) == false;
    }, transactions)
    .concat(transactions);

    overviewPage.recent(transactions.slice(0,7));

    $("#transactions .footable").trigger("footable_redraw");

}

var contacts = {};
var contact_list;
var contact_group_list;
var contact_book_list;
var current_key = "";


function shadowChatInit() {
    var menu = [{
            name: 'Send&nbsp;Shadow',
            fun: function () {
                clearRecipients();
                $("#pay_to0").val($('#contact-list .selected .contact-address').text());
                $("#navpanel [href=#send]").click();
            }
        },
        {
            name: 'Copy&nbsp;Address',
            fun: function () {
                copy('#contact-list .selected .contact-address');
            }
        },
        /*
        {
            name: 'Send&nbsp;File',
            img: 'qrc:///icons/editcopy',
            fun: function () {
                copy('#transactions .footable .selected .address', "data-label");
            }
        },*/
        {
            name: 'Private&nbsp;Message',
            fun: function () {
                $("#message-text").focus();
            }
        } /*,
        {
            name: 'Edit&nbsp;Label',
            fun: function () {
                console.log("todo"); //TODO: this...
            }
        } /*,
        {
            name: 'Block&nbsp;Address',
            fun: function () {
                console.log("todo"); //TODO: Blacklist...
            }
        }*/
        ];

    //Calling context menu
    $('#contact-list').on('contextmenu', function(e) {
       $(e.target).closest('li').click();
    }).contextMenu(menu, {triggerOn:'contextmenu', sizeStyle: 'content'});

    /*
    menu = [{
            name: 'Copy&nbsp;Message',
            fun: function () {
                var selected = $(".contact-discussion li.selected"),
                    id = selected.attr("id");

                $.each(contacts[selected.attr("contact-key")].messages, function(index){if(this.id == id) copy(this.message, 'copy');});
            }
        },
        
        {
            name: 'Send&nbsp;File',
            fun: function () {
                copy('#transactions .footable .selected .address', "data-label");
            }
        },
        {
            name: 'Delete&nbsp;Message',
            fun: function () {
                $(".contact-discussion li.selected").find(".delete").click();
            }
        }];

    $('.contact-discussion').on('contextmenu', function(e) {
        $(e.target).closest('li').addClass("selected");
    }).contextMenu(menu, {triggerOn:'contextmenu', sizeStyle: 'content'});
    */

    menu = [
        {
            name: 'Copy&nbsp;Selected',
            fun: function () {
                var editor = $("#message-text")[0];

                if (typeof editor.selectionStart !== 'undefined')
                    copy(editor.value.substring(editor.selectionStart, editor.selectionEnd), 'copy');
            }
        },
        {
            name: 'Paste',
            fun: function () {
                paste("#pasteTo");

                var editor = $("#message-text")[0];

                if(typeof editor.selectionStart !== 'undefined')
                    editor.value = editor.value.substring(editor.selectionStart, 0) + $("#pasteTo").val() + editor.value.substring(editor.selectionStart);
                else
                    editor.value += $("#pasteTo").val();
            }
        }];

    $('#message-text').contextMenu(menu, {triggerOn:'contextmenu', sizeStyle: 'content'});

    //ON ENTER SUBMIT MESSAGE
    $("#message-text").keypress(function (e) {
        if (e.which == 13 && !e.shiftKey) {
            e.preventDefault();

            if($("#message-text").val() == "")
                return 0;

            removeNotificationCount();
            sendMessage();

        }
    });

    //ONCLICK REMOVE NOTIFICATION
    $("#messages")
        .selection()
        .on('click',
        function(e) {
            if(current_key !== "")
                removeNotificationCount(current_key);
        });

        $("#contact-list").on("mouseover", function(){ contactScroll.refresh()});
        $("#contact-group-list").on("mouseover", function(){ contactGroupScroll.refresh()});
        $("#contact-book-list").on("mouseover", function(){ contactBookScroll.refresh()});

}



function appendMessages(messages, reset) {
    contact_list = $("#contact-list ul");
    contact_group_list = $("#contact-group-list ul");

    if(reset) {
        // We have to delete/clear messages when wallet is locked...
        for(var k in contacts)
            if(contacts[k].messages.length > 0)
                contacts[k].messages = [];

            $("#chat-menu-link .details").hide();

        contact_list.html("");
        contact_group_list.html("");
        $("#contact-list").removeClass("in-conversation");
        $("#contact-group-list").removeClass("in-conversation");
        $(".contact-discussion ul").html("");
        $(".user-notifications").hide();
        $("#message-count").text(0);
        messagesScroller.scrollTo(0, 0);
        contactScroll   .scrollTo(0, 0);
        contactGroupScroll   .scrollTo(0, 0);
        contactBookScroll   .scrollTo(0, 0);

        $("#invite-group-btn").hide();
        $("#leave-group-btn").hide();
    }

    if(messages == undefined)
        return;
    /*
    Keep this in for further reference: JSON doesn't play well with some characters http://www.jslint.com/help.html
    var banned_json_regex = /([\u0000-\u001f])|([\u007f-\u009f])|([\u00ad])|([\u0600-\u0604])|([\u070f])|([\u17b4-\u17b5])|([\u200c-\u200f])|([\u2028-\u202f])|([\u2060-\u206f])|([\ufeff])|([\ufff0-\uffff])+/g;
    messages = JSON.parse(messages.replace(/,\]$/, "]").replace(banned_json_regex,""));
    */

    // Message data
    messages.forEach(function(message) {
        appendMessage(message.id,
                      message.type,
                      message.sent_date,
                      message.received_date,
                      message.label_from_role,
                      message.label_from,
                      message.label_to,
                      message.to_address,
                      message.from_address,
                      message.read,
                      message.message,
                      reset);
    });

    if(reset)
        openConversation(contacts[current_key].address, false);

    $(contacts[current_key].group ? "#contact-group-list" : "#contact-list").addClass("in-conversation");
}

function appendMessage(id, type, sent_date, received_date, label_value, label, labelTo, to_address, from_address, read, message, initial) {
    var them = type == "S" ? to_address   : from_address;
    var self = type == "S" ? from_address : to_address;
    var contact_address = them;

    var label_msg = type == "S" ? (labelTo == "(no label)" ? self : labelTo) : (label == "(no label)" ? them : label);
    var label_chat;
    var key = them;
    var key_msg = type == "S" ? self : them;

    var group = false;
    //Setup instructions: make sure the receiving address is named 'group_ANYTHING'.
    //It's best to add the sender of the message with a label so you get a nice overview!

    /* This is just a cheat to test the formatting, because the if clause down below is always returning false.
    It will put all messages under the same contact*/

    if(labelTo.lastIndexOf("group_", 0) === 0) { //Received, to group
        label_chat = labelTo.replace('group_', '');
        group = true;
        key =  self;
    } else if(label_value.lastIndexOf("group_", 0) === 0) { //sent to group,
        label_chat = label_value.replace('group_', '');
        group = true;
        key =  them;
        key_msg = self;
    /*}  else if(self == "anon" && type == "S") { //sent by group, should not be possible but yeah anything can happen.
        console.log("[anon] self == anon true");
        key = self; */
    } else {
        label_chat = label_msg;
    }

    /*
    Basically I seperated the sender of the message (label_msg) from the contact[key].
    So we can still group by the key, but the messages in the chat have the right sender label.
    */

    //INVITE TO GROUP CODE

    if(message.lastIndexOf("/invite", 0) === 0 && message.length >= 60) {

        var group_key = message.match(/[V79e][1-9A-HJ-NP-Za-km-z]{50,51}/g);
        var group_label = message.substring(61, message.length).replace(/[^A-Za-z0-9\s!?]/g, ""); // regex whitelist only a-z, A-Z, 0-9

        if (group_key != null) {

            if(type = "R") { //If message contains /invite privkey label, insert HTML
                //message = 'You\'ve been invited to a group named \'' + group_label + '\'! <a class="btn btn-danger btn-cons" onclick="//bridge.joinGroupChat(\'' + group_key + '\',\'group_' + group_label + '\')"><i class="fa fa-plus"></i>Join group</a>';
                if (!read)
                    addInvite(group_key, group_label, id);
                return false;
            } else if (type = "S")
                message = "An invite for group " + group_label + " has been sent.";

        } else if (group_label.length == 0)
            group_label = them + "_" + String(group_key).substring(1, 5);
        else if (group_key == null)
            message = "The group invitation was a malconfigured private key.";
    }

    //create group
    createContact(label_chat, key, group);

    //create contact and link it to the group
    if(group){
        createContact(label_msg, them, false, false);
        addContactToGroup(key_msg, key);
    }

    var contact = contacts[key];

    if($.grep(contact.messages, function(a) { return a.id == id; }).length == 0) {

        contact.messages.push({id:id, them: them, self: self, label_msg: label_msg, key_msg: key_msg, group: group, message: message, type: type, sent: sent_date, received: received_date, read: read});

        contact.messages.sort(function (a, b) {
            return a.received - b.received;
        });

        appendContact(key, false);
        if (current_key == key && !initial) //on send of our own message reload convo to add message.
            openConversation(key, false); //hmm

         if (type == "R" && read == 0)
            addNotificationCount(key, 1);
     }

     if(current_key == "")
        current_key = key;

}

/*
    VERIFIED LIST
*/

 var verified_list = 
        {
            /* TEAM */
            "SdcDevWEbq3CZgZc8UNbST1TaYLA5vLZTS": {
                "username": "sdcdev-slack",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "SR46wGPK5sGwT9qymRNTVtF9ExHHvVuDXQ": {
                "username": "crz",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "SVY9s4CySAXjECDUwvMHNM6boAZeYuxgJE": {
                "username": "kewde",
                "title": "Shadowteam",
                "custom_avatar" : true
            },
            "dasource": {
                "username": "dasource",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "SNLYNVwWQNgPqxND5iWyRfnGbEPnvSGVLw": {
                "username": "ffmad",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "STWYshQBdzk47swrp2S77jHLxjrNAWUNdq": {
                "username": "ludx",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "edu-online": {
                "username": "edu-online",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "SU9FqHpVg929arDpT9TjTc5XkSxGgzHvff": {
                "username": "arcanum",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "STAKEbLd2DecHRadoXyBE5jmZrJztLr9TE": {
                "username": "allien",
                "title": "Shadowteam",
                "custom_avatar" : false
            },
            "sebsebastian": {
                "username": "sebsebastian",
                "title": "Shadowteam",
                "custom_avatar" : false
            }
            /* Contributors */
            ,
            "SPXkEj2Daa9un5uzKHFNpseAfirsygCAhq": {
                "username": "litebit",
                "title": "Contributor",
                "custom_avatar" : true
            } 
            /* Verified */ 
            ,
            "SZxH6HNYAh9iNaGLdoHYjSN2qWvfjahrF1": {
                "username": "6ea86b96",
                "title": "Verified"
            },           
            "ShKkz1b6XD4ASgTP9BAh8C3zi4Z9HsCH5F": {               
                "username": "dadon",               
                "title": "Verified"           
            },
            "ScrvNCexThmfctYcLZLwzFCcaH6znW69sj": {
                "username": "dzarmush",
                "title": "Verified"
            },           
            "SZ8bMXxkBELD6s5jSsBRLCwvkXibwRWw4q": {               
                "username": "GRE3N",               
                "title": "Verified"           
            },         
            "SPAfq2i8cP1SMcaTT8nMTxa2Fg9LNNJSyk": {              
                "username": "NGS",              
                "title": "Verified"          
            },
            "ShFr9RAZuMsCUK7ZKDxukCDbCtBER4CHC7": {
                "username": "rustynailer",
                "title": "Verified"
            },
            "SWUBRJUdgck6d8tiM5hf4wEAAp3J8JyuQj": {
                "username": "The-C-Word",
                "title": "Verified"
            },
            "SgyxAj1j2ebtecYAFu5McPyzZUqDX3UpBP": {
                "username": "tintifax",
                "title": "Verified"
            },
            "SWG4eCfpsrFwB64owwrLjvDnyYkdCp2oPi": {
                "username": "wwonka36",
                "title": "Verified"
            }
}

/*
    Contact functions
*/
function createContact(label, address, is_group, in_addressbook) {
    var contact = contacts[address];
    var small_label_hack = getContactUsername(address);
    if (contacts[address] == undefined) {
        contacts[address] = {},
        contact = contacts[address],
        contact.key = address,
        contact.label = small_label_hack, /* og: label; */
        contact.address = address,
        contact.group = is_group,
        contact.addressbook = (in_addressbook == undefined ? false : in_addressbook),
        contact.title = (isStaticVerified(address) ? verified_list[address].title : (is_group ? "Untrusted" : (contact.addressbook ? "Verified" : "Unverified"))), //If message sent from group address mark it as untrusted as it is impossible to do with GUI. Manipulation
        contact.avatar_type = 0,
        contact.avatar = "", // TODO: Avatars!!
        contact.messages  = [];

        if(is_group) 
            contact.contacts  = [];
    }
}

function addContactToGroup(key, group_key){
    //check if group contact exists
    if(contacts[group_key] == undefined)
        return false;

    //check if contact exists
    if(contacts[key] == undefined)
        return false;

    //check if contact is already in group
    if(!existsContactInGroup(key, group_key)){
        contacts[group_key].contacts.push(key);
        return true;
    } 

    return false;
}

function existsContact(address){
    return (contacts[address] != undefined);
}

function existsContactInGroup(key, group_key){
    return(!contacts[group_key].contacts.indexOf(key) == -1);
}

/*
function updateContactTitle(key){
    if(!existsContact(key))
        return false;

    if(contacts[key].group)
        return false;

    if(!isStaticVerified(key))
        return false;

    contacts[key].title = verified_list[key].title;
    return true;
}
*/

function updateContact(label, address, contact_address, open_conversation) {
    open_conversation = (open_conversation !== false);

    //if address is a group address, then we'll be search for contact_address in the group messages
    var contact = contacts[address];
    if (contact !== undefined) {
        if (contact_address === undefined || address==contact_address)
            contact_address = "";

        //loop through messages and change name
        contact.messages.forEach(function(message) {
            if (message.type === "R" && (message.them === address || message.them === contact_address))
                message.label_msg = label;
        });

        if (contact_address === "") { //if not groupchat
            contacts[address].label = label;
            $("#contact-book-" + address + " .contact-info .contact-name").text(label);
            $("#contact-" + address + " .contact-info .contact-name").text(label);
        } else {
            $("#contact-book-" + contact_address + " .contact-info .contact-name").text(label);
            $("#contact-" + contact_address + " .contact-info .contact-name").text(label);
        }
        if (openConversation)
            openConversation(address, true);
    }
    //check if current key is ==address
    //loop through messages and change label
}

function appendContact (key, openconvo, addressbook) {
    var elementName = addressbook ? "contact-book-" : "contact-";
    var contact_el = $("#" + elementName +key);
    var contact = contacts[key];

    if (contact_el.length === 0) {
        var latestMessage = "";
        if(contact.messages[0] !== undefined && !addressbook)
            latestMessage = contact.messages[0].message;

        var contact_html =
            "<li id='"+ elementName + key +"' class='contact' data-title='"+contact.label+"'>\
                <span class='contact-info'>\
                    <span class='contact-name'>"+ ((contact.group && addressbook) ? "<i class='fa fa-users' style='padding-right: 7px;'></i>" : "") + contact.label+"</span>\
                    <span class='" + (addressbook ? "contact-address" : "contact-message") + "'>"+ (addressbook ? contact.address : latestMessage) + "</span>\
                </span>\
                <span class='contact-options'>\
                        <span class='message-notifications'>0</span>\ " + //"+(unread_count==0?' none':'')+"
                        "<span class='delete' onclick='deleteMessages(\""+key+"\")'><i class='fa fa-minus-circle'></i></span>\
                        " //<span class='favorite favorited'></span>\ //TODO: Favourites
             + "</span>"
             + "</li>";

        if (addressbook) {
            contact_book_list.append(contact_html);
            $("#"+ elementName + key).find(".delete").hide();
        } else if(contact.group) { //if not group

            contact_group_list.append(contact_html);
        } else
            contact_list.append(contact_html);



        //onClick contact in sidebar list, on hover and on delete.
        contact_el = $("#" + elementName + key)
            .selection('li')
            //.tooltip()
            .on('dblclick', function click(e) {
                openConversation(key, true);
                prependContact(key);
            }).on('click', function click(e) {
                openConversation(key, true);
            });


        if(addressbook)
            contact_el.on('click', function click(e) {
                //appendContact(key, false);
            });

        contact_el.find(".delete").on("click", function(e) {e.stopPropagation()});
        contact_el.find(".message-notifications").hide();

    } else
        if(contact.messages !== undefined && !addressbook)
            $("#" + elementName + key + " .contact-info .contact-message").text(contact.messages[contact.messages.length-1].message);

    if(openconvo) { //|| contact_el.hasClass("selected")
        openConversation(key, false);
    }
}

function getContactUsername(key, no_key_return){
    //set no_key_return to anything and it won't return the address if no label is found.

    var bridge_label;
    //check if in verified list
    if(typeof verified_list[key] === "object")
        return verified_list[key]["username"];

    //check if backend has label for it
    bridge_label = bridge.getAddressLabel(key);
    if(typeof bridge_label == "string" && bridge_label != ""){
            return bridge_label.replace("group_","");
    }
    //no label
    if(no_key_return != undefined)
        return ""; //no_key_return to returning empty

    return key; //returning address
}

//console.log("verified list" + verified_list["SVY9s4CySAXjECDUwvMHNM6boAZeYuxgJE"]["username"]);
//console.log("getContactName" + getContactUsername("SVY9s4CySAXjECDUwvMHNM6boAZeYuxgJE"));

function isStaticVerified(key){
    return (typeof verified_list[key] === "object");
}

function allowCustomAvatar(key){
    //return false;
    return (typeof verified_list[key] === "object" && typeof verified_list[key].custom_avatar === "boolean" && verified_list[key].custom_avatar);
}

function getIconTitle(title){
    if(title == "unverified"){
        return "fa fa-cross ";
    } else if(title == "verified"){
        return "fa fa-check ";
    } else if(title == "contributor"){
        return "fa fa-cog ";
    } else if(title == "shadowteam"){
        return "fa fa-code ";
    }
    return "";
}

/*
        end
    Contact functions
    
*/

function addNotificationCount(key, unread_count) {

    if(contacts[key] == undefined)
        return false;

    var notifications_contact = $("#contact-"+key).find(".message-notifications");
    var notifications_contact_value = notifications_contact.html();
    notifications_contact
        .text(parseInt(notifications_contact_value) + parseInt(unread_count))
        .show();
    $("#chat-menu-link .details").show();
    $(".user-notifications").show();
    $("#message-count").text(parseInt($("#message-count").text())+1).show();

    $("#contact-"+key).prependTo(contacts[key].group ? "#contact-group-list ul" : "#contact-list ul");
}

function removeNotificationCount(key) {

    if(key == undefined && current_key !== "")
        key = current_key;

    //iscrollReload();
    //scrollMessages(); //THIS ONE WORKS
    messagesScroller.refresh();

    //NOTIFICATION IN CONTACT LIST
    var contact = contacts[key];

    if(contact == undefined)
        return false;

    var notifications_contact = $("#contact-"+key).find(".message-notifications");
    var notifications_contact_value = notifications_contact.html();

    if(notifications_contact.text() == 0)
        return false;

    notifications_contact.text(0);
    notifications_contact.hide();

    //NOTIFICATION IN MENU
    var notifications_menu = $("#message-count"),
        notifications_menu_value = parseInt(notifications_menu.text())-notifications_contact_value;

    notifications_menu.text(notifications_menu_value);

    if(notifications_menu_value==0){
        notifications_menu.hide();
        $("#chat-menu-link .details").hide();
    }
    else
        notifications_menu.show();

    //mark messages as read in JS
    if(contact.messages.length == 0)
        return 0;

    var i = contact.messages.length;

    while (i--)
        if(!contact.messages[i].read)
             bridge.markMessageAsRead(contact.messages[i].id);

}

//OpenConversation is split off to allow for opening conversation automatically without removing notification.
function openConversation(key, click) {

    if(click)
         $("#chat-menu-link").click();//open chat window when on other page

    current_key = key;
    //TODO: detect wether user is typing, if so do not reload page to other conversation..
    //$(this).addClass("selected").siblings("li").removeClass("selected");
    var discussion = $(".contact-discussion ul");
    var contact = contacts[key];

    discussion.html("");


    var is_group = contact.group;

    if(is_group){
        $("#invite-group-btn").show();
        //$("#leave-group-btn").show();
    } else {
        $("#invite-group-btn").hide();
        $("#leave-group-btn").hide();
    }



    //Set label in discussion
    $("#chat-header").text(contact.label).addClass("editable");
    $("#chat-header").data("value", contact.label);
    $("#chat-header").off();
    $("#chat-header").on("dblclick", function (event) {
        event.stopPropagation();
        updateValueChat($(this), contact.key);
    }).attr("data-title", "Double click to edit").tooltip();

    var message;
    var prev_message;

    if(click)
        removeNotificationCount(contact.key);

    function processMessageForDisplay(message) {
        return micromarkdown.parse(
            emojione.toImage(message)).replace(
                /<a class="mmd_shadowcash" href="(.+)">(.+)<\/a>/g,
                '<a class="mmd_shadowcash" onclick="return confirmConversationOpenLink()" target="_blank" href="$1" data-title="$1">$1</a>');
    }

    contact.messages.forEach(function(message, index) {

        if (index > 0 && combineMessages(prev_message, message)) {
            $("#"+ prev_message.id).attr("id", message.id);
            $("#" + message.id + " .message-text").append(processMessageForDisplay(message.message));

            prev_message = message;
            return;
         }
         prev_message = message;




        var time  = new Date(message.sent*1000);//.toLocaleString()
        var timeReceived  = new Date(message.received*1000);

        //title='"+(message.type=='S'? message.self : message.them)+"' taken out below.. titles getting in the way..
        //TODO: parse with regex to be sure.. do in appendMessage
        addAvatar(message.them);

        var label_msg;
        if(contacts[message.key_msg] != undefined)
            label_msg = contacts[message.key_msg].label;
        else
            label_msg = getContactUsername(message.key_msg);

        var onclick = (label_msg == message.key_msg) ? " data-toggle=\"modal\" data-target=\"#add-address-modal\" onclick=\"clearSendAddress(); $('#add-rcv-address').hide(); $('#add-send-address').show(); $('#new-send-address').val('" + message.key_msg + "')\" " : "";
        discussion.append(
            "<li id='"+message.id+"' class='message-wrapper "+(message.type=='S'?'my-message':'other-message')+"' contact-key='"+contact.key+"'>\
                <span class='message-content'>\
                    <span class='info'>"+ (message.type=='S'? getAvatar(message.self) : getAvatar(message.them))+ "</span>\
                    <span class='user-name' " + onclick + ">"
                        +(label_msg)+"\
                    </span>\
                    <span class='title'>\
                    </span>\
                    <span class='timestamp'>"+((time.getHours() < 10 ? "0" : "")  + time.getHours() + ":" +(time.getMinutes() < 10 ? "0" : "")  + time.getMinutes() + ":" +(time.getSeconds() < 10 ? "0" : "")  + time.getSeconds())+"</span>\
                       <span class='delete' onclick='deleteMessages(\""+contact.key+"\", \""+message.id+"\");'><i class='fa fa-minus-circle'></i></span>\
                       <span class='message-text'>"+ processMessageForDisplay(message.message) +  "</span>\
                </span>\
             </li>");
         $('#' + message.id + ' .timestamp').attr('data-title', 'Sent: ' + time.toLocaleString() + '\n Received: ' + timeReceived.toLocaleString())
            .tooltip().find('.message-text')
            .tooltip();

        insertTitleHTML(message.id, message.key_msg);

        //Check if group message, if we sent a message in the past and make sure we assigned the same sender address to the chat.
        $('#' + message.id + ' .user-name').attr('data-title', '' + (message.type == "S" ? message.self : message.them)).tooltip();
 
        getOurAddress(key, true);
        //discussion.children("[title]").on("mouseenter", tooltip);


        if(contact.messages.length == 0) {
             $(".contact-discussion ul").html("<li id='remove-on-send'>Starting Conversation with "+contact.label+" - "+contact.address+"</li>");
             $("#message-to-address").val(contact.address);
        }
    });


    setTimeout(function() {scrollMessages();}, 200);
}

function getOurAddress(key, set){
    //returns the address to which the message was sent, or in the case of a group check
    // key = address of the other party
    // set = true or false, set the chat receiver and sender addresses for the current session
    if(!existsContact(key))
        return false;

    var contact = contacts[key];
    var is_group = contact.group;

    if(contact.messages.length == 0){
        //TODO: open up choose sender dialog
        return false;
    }

    var r = false;
    contact.messages.some(function(message, index) {
        if(!is_group || message.type == "S") { //if it's not a group, do the normal procedure. If it's group it must be a sent message.

            if(set)
                setSenderAndReceiver(message.self, key);
            r = message.self;
            return true;
        }
    });
    return r;
}

function setSenderAndReceiver(sender, receiver){
    $("#message-from-address").val(sender);
    $("#message-to-address").val(receiver);
}

function insertTitleHTML(id, key){
    //id = message id
    if(!existsContact(key))
        return false;

    var contact = contacts[key];
    //console.log("insertTitleHTML key=" + key + " title=" + contact.title);
    var title = contacts[key].title.toLowerCase();
    $("#" + id + " .title").addClass(getIconTitle(title) + title + "-mark");
    $("#" + id + " .title").hover(
        function ()
        {
            //on hover
            $(this).text(" " + title);
        },
        function ()
        {
            //off hover
            $(this).text("");
        }
    );
}


function confirmConversationOpenLink() {
    // TODO: Disable convirm option.
    return (confirm('Are you sure you want to open this link?\n\nIt will leak your IP address and other browser metadata, the least we can do is advice you to copy the link and open it in a _Tor Browser_ instead.\n\n You can disable this message in options.'));
}

function combineMessages(prev_message, message){
    if(prev_message.type != message.type)
        return false;

    if(message.type == "R" && prev_message.them == message.them)
        return true;

    if(message.type == "S" && prev_message.self == message.self)
        return true;

    return false;
}

function addRandomAvatar(key){ 

    if(!existsContact(key))
        return false;


    contacts[key].avatar_type = 1;
    contacts[key].avatar = generateRandomAvatar(key);

    /*
     $("#"+id + " .info").append($("<canvas/>")
        .attr({ "width": 40, "height": 40 })
        .jdenticon(md5(key)));*/
}

function generateRandomAvatar(key){
    var shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.update(key);
    var hash = shaObj.getHash("HEX");
    var data = new Identicon(hash, 40).toString();
    return '<img width=40 height=40 src="data:image/png;base64,' + data + '">';
    //$("#"+id + " .info").append('<img width=40 height=40 src="data:image/png;base64,' + data + '">');
}


function addCustomAvatar(key){
    contacts[key].avatar_type = 2;
    contacts[key].avatar = '<img width=40 height=40 src="assets/img/avatars/' + contacts[key].label + '.png">';
    //load custom avatar html
}

function addAvatar(key){
    if(allowCustomAvatar(key)){
        addCustomAvatar(key);
    }
    else
        addRandomAvatar(key);

}

function getAvatar(key){
    if(allowCustomAvatar(key))
        return '<img width=40 height=40 src="assets/img/avatars/' + verified_list[key].username + '.png">';

    if(!existsContact(key)){
        return generateRandomAvatar(key);
    }
    
    return contacts[key].avatar;
}


function prependContact(key) {
    var contact = contacts[key];

    if(!contact.group) {
        $("#contact-list").addClass("in-conversation");
        $("#contact-" + key).prependTo($("#contact-list ul"));

    } else {
        $("#contact-group-list").addClass("in-conversation");
        $("#contact-" + key).prependTo($("#contact-group-list ul"));
    }

}

function createGroupChat() {
    var group_label = $("#new-group-name").val();

    if(group_label == "")
        return false;

    $("#filter-new-group").text("");



    $("#new-group-modal").modal('hide');

    var group_address = bridge.createGroupChat(group_label);
    inviteGroupChat(group_address);

    createContact(group_label, group_address, true);
    appendContact(group_address, true, false);
}

/*
    All code related to "inviting" to groupchat
                    -begin-
*/
function addInvite(privkey, label, id) {
    if($("#invite-" + privkey + "-" + id ).length != 0)
        return false; 


    $("#group-invite-list").append(
            "<div id='invite-" + privkey + "-" + id + "'>" +
                 "<a class='group-invite'>"+
                  "<i class=\"fa fa-envelope\"></i>"+
                  "<span class=\"group-invite-label\"> " + label + " </span>"+
                  "<i class=\"fa fa-check group-invite-check\" onclick='acceptInvite(\"" + privkey + "\",\"" + label + "\", \"" + id + "\");'></i>"+
                  "<i class=\"fa fa-close group-invite-close\" onclick='deleteInvite(\"" + privkey + "\",\"" + id + "\");'></i>"+
                "</a>"+
             "</div>"
    );
}

function deleteInvite(key, id) {
    bridge.deleteMessage(id);
    $("#invite-" + key + "-" + id).html("");
}

function acceptInvite(key, group_label, id) {
    deleteInvite(key, id);
    var group_address = bridge.joinGroupChat(key,group_label);

    if(group_address === "false")
        return false;

    updateContact(group_label, group_address);

    createContact(group_label, group_address, true);
    appendContact(group_address, true, false);

}


function inviteGroupChat(group_address){
    var contacts_to_invite = [];
    var element = "#invite-modal-tbody";

    if(group_address != undefined)
        element = "group-modal-tbody";
    else 
        group_address = current_key;

    $(element + " tr" ).each(function() {
        var address = $(this).find(".address").text();
        var checked = $(this).find(".invite .checkbox").is(':checked');

        if(checked){
            contacts_to_invite.push(address);
            $(this).find(".invite .checkbox").attr("checked", false);
        }

    });

    var invited_addresses = [];

    if(contacts_to_invite.length > 0)
        invited_addresses = bridge.inviteGroupChat(group_address, contacts_to_invite, $("#message-from-address").val());

    if(invited_addresses.length > 0){

    }

}

function leaveGroupChat(){
    var result = bridge.leaveGroupChat(current_key);
    return result;
}

function openInviteModal(){
    if(current_key.length == 0){
        return false;
    }

    var label = bridge.getAddressLabel(current_key).replace("group_","");
    $("#existing-group-name").val(label);
}

function submitInviteModal(){
    //triggered on btn push of invite modal

    inviteGroupChat();
    $("#invite-to-group-modal").hide();

}

/*
                    -end-
    All code related to "inviting" to groupchat
*/

function scrollMessages() {

    var old_y = messagesScroller.y;
    var old_max = messagesScroller.maxScrollY;

    messagesScroller.refresh();

    var scrollerBottom = function(old_y, old_max) {
        var new_max = messagesScroller.maxScrollY;

        if(old_max > new_max && old_max == old_y)
            messagesScroller.scrollTo(0, messagesScroller.maxScrollY, 100);
    };

    setTimeout(scrollerBottom(old_y, old_max), 100);
}

function openNewConversationModal(){
    var address = $('#new-contact-address').val();
    var contact_name = $("#new-contact-name").val();

    console.log("newConvo called!");
    console.log("length=" + $("#contact-"+address).length);

    if($("#contact-"+address).length == 1){

        if(bridge.getAddressLabel(address) != contact_name)
            addSendAddressBackend(contact_name, address);

        setTimeout(function(){
            updateContact(contact_name, address);
            openConversation(address, false);
            cleanNewConversationModal();
            console.log("cleaned");
        }, 500);

        return closeNewConversationModal();
    }

    createContact(contact_name, address, false);
    result = bridge.newAddress(contact_name, 0, address, true);
    if (result === "")
        if (bridge.lastAddressError() !== 'Duplicate Address.') {
            $("#new-contact-address").css("background", "#E51C39").css("color", "white");
            return;
        }

    $("#new-contact-address").css("background", "").css("color", "");

    
    bridge.setPubKey($('#new-contact-address').val(), $("#new-contact-pubkey").val());
    bridge.updateAddressLabel($('#new-contact-address').val(), $("#new-contact-name").val());
    $('#new-contact-modal').modal('hide');
    $("#message-to-address").val($("#new-contact-address").val());
    $("#message-text").focus();
 


    $("#contact-list ul li").removeClass("selected");
    $("#contact-list").addClass("in-conversation");

    $("#contact-group-list ul li").removeClass("selected");
    $("#contact-group-list").addClass("in-conversation");

    /* setTimeout(function(){
        openConversation(address, true);
        $(".contact-discussion ul").html("<li id='remove-on-send'>Starting Conversation with "+address+" - "+contact_name+"</li>");
    }, 1000);*/

    //temp shutdown

    closeNewConversationModal();
    openPickSenderMsgAddrModal();
    return true;

}

function closeNewConversationModal(){
    // clean up new new-contact-modal and close it.
    $('#new-contact-modal').modal('hide');
    return true;
}
function cleanNewConversationModal(){
    $("#new-contact-address").val("");
    $("#new-contact-name").val("");
    $("#new-contact-pubkey").val("");
}

function openPickSenderMsgAddrModal(){
    //This function opens the dialog and copies all the identities from the original select input (#message-from-address)
    var select_html = "<option title='Please select and address to send from' value='none'>Select identity</option>" + $("#message-from-address").html();
    $("#pick-sender-msg-selector").html(select_html);
    $("#pick-sender-msg-modal").modal('show');
}

function startNewConversation() {
    console.log("startNewConversation");
    var sender_msg_address = $("#pick-sender-msg-selector").val();

    if (sender_msg_address == "none") {
        alert("Please select an address.");
        return false;
    }

    $("#message-from-address").val(sender_msg_address);

    var receiver_msg_address = $("#new-contact-address").val();
    openConversation(receiver_msg_address, true);
    closePickSenderMsgAddrModal();
    //verify that sender msg selector is not none..
}

function closePickSenderMsgAddrModal() {
    cleanNewConversationModal();
    $("#pick-sender-msg-modal").modal('hide');
}

function sendMessage() {
    $("#remove-on-send").remove();

    if(bridge.sendMessage(current_key, $("#message-text").val(), $("#message-from-address").val()))
        $("#message-text").val("");
}

function deleteMessages(key, messageid) {
    var contact = contacts[key];

    if(!confirm("Are you sure you want to delete " + (messageid == undefined ? 'these messages?' : 'this message?')))
        return false;

    var message_count = $("#message-count"),
        message_count_val = parseInt(message_count.text());

    removeNotificationCount(key);

    if(messageid == undefined)
        current_key = "";

    for(var i=0;i<contact.messages.length;i++) {

        if(messageid === undefined) { //delete all messages of key
            if(bridge.deleteMessage(contact.messages[i].id)) {
                $("#"+contact.messages[i].id).remove();
                contact.messages.splice(i, 1);
                i--;
            } else
                return false;

        } else if(contact.messages[i].id === messageid) { //delete a specific message ID.
            if(bridge.deleteMessage(messageid)) {
                $("#"+messageid).remove();
                contact.messages.splice(i, 1);
                i--;
                break;
            } else
                return false;
        }
    }

    if(contact.messages.length == 0) {
        $("#contact-"+ key).remove();
        $("#contact-list").removeClass("in-conversation");
        $("#contact-group-list").removeClass("in-conversation");
    } else {
        iscrollReload();
        openConversation(key, false);
    }
}

function signMessage() {
    //Clear any signature to avoid confusion with a previous signature being displayed with errors relating to the current values
    $('#sign-signature').val("");
    var address, message, error, signature = "";
    address = $('#sign-address').val().trim();
    message = $('#sign-message').val().trim();

    var result = bridge.signMessage(address, message);

    error = result.error_msg;
    signature = result.signed_signature;

    if(error !== "" ) {
        $('#sign-result').removeClass('green');
        $('#sign-result').addClass('red');
        $('#sign-result').html(error);
        return false;
    } else {
        $('#sign-signature').val(result.signed_signature);
        $('#sign-result').removeClass('red');
        $('#sign-result').addClass('green');
        $('#sign-result').html("Message signed successfully");
    }
}

function verifyMessage() {

    var address, message, error, signature = "";
    address = $('#verify-address').val().trim();
    message = $('#verify-message').val().trim();
    signature = $('#verify-signature').val().trim();

    var result = bridge.verifyMessage(address, message, signature);

    error = result.error_msg;

    if(error !== "") {
        $('#verify-result').removeClass('green');
        $('#verify-result').addClass('red');
        $('#verify-result').html(error);
        return false;
    } else {
        $('#verify-result').removeClass('red');
        $('#verify-result').addClass('green');
        $('#verify-result').html("Message verified successfully");
    }
}

var contactScroll = new IScroll('#contact-list', {
    mouseWheel: true,
    lockDirection: true,
    scrollbars: true,
    interactiveScrollbars: true,
    scrollbars: 'custom',
    scrollY: true,
    scrollX: false,
    preventDefaultException:{ tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|P|SPAN)$/ }
});

var contactGroupScroll = new IScroll('#contact-group-list', {
    mouseWheel: true,
    lockDirection: true,
    scrollbars: true,
    interactiveScrollbars: true,
    scrollbars: 'custom',
    scrollY: true,
    scrollX: false,
    preventDefaultException:{ tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|P|SPAN)$/ }
});

var contactBookScroll = new IScroll('#contact-book-list', {
    mouseWheel: true,
    lockDirection: true,
    scrollbars: true,
    interactiveScrollbars: true,
    scrollbars: 'custom',
    scrollY: true,
    scrollX: false,
    preventDefaultException:{ tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|P|SPAN)$/ }
});

var messagesScroller = new IScroll('.contact-discussion', {
   mouseWheel: true,
   lockDirection: true,
   scrollbars: true,
   interactiveScrollbars: true,
   scrollbars: 'custom',
   scrollY: true,
   scrollX: false,
   preventDefaultException:{ tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|P|SPAN)$/ }
});


function iscrollReload(scroll) {
    contactScroll.refresh();
    contactGroupScroll.refresh();
    contactBookScroll.refresh();
    messagesScroller.refresh();

    if(scroll === true)
        messagesScroller.scrollTo(0, messagesScroller.maxScrollY, 0);
}


function editorCommand(text, endText) {

        var range, start, end, txtLen, scrollTop;

        var editor = $("#message-text")[0];

        scrollTop = editor.scrollTop;
        editor.focus();

        if (typeof editor.selectionStart !== 'undefined')
        {
                start  = editor.selectionStart;
                end    = editor.selectionEnd;
                txtLen = text.length;

                if(endText)
                        text += editor.value.substring(start, end) + endText;

                editor.value = editor.value.substring(0, start) + text + editor.value.substring(end, editor.value.length);

                editor.selectionStart = (start + text.length) - (endText ? endText.length : 0);
                editor.selectionEnd = editor.selectionStart;
        }
        else
            editor.value += text + endText;

        editor.scrollTop = scrollTop;
        editor.focus();
};


var chainDataPage = {
    anonOutputs: {},
    init: function() {
        $("#show-own-outputs,#show-all-outputs").on("click", function(e) {
            $(e.target).hide().siblings('a').show();
        });

        $("#show-own-outputs").on("click", function() {
            $("#chaindata .footable tbody tr>td:first-child+td").each(function() {
                if($(this).text()==0)
                    $(this).parents("tr").hide();
            });
        });

        $("#show-all-outputs").on("click", function() {
            $("#chaindata .footable tbody tr:hidden").show();
        });
    },
    updateAnonOutputs: function() {
        chainDataPage.anonOutputs = bridge.listAnonOutputs();
        var tbody = $('#chaindata .footable tbody');
        tbody.html('');

        for (value in chainDataPage.anonOutputs) {
            var anonOutput = chainDataPage.anonOutputs[value];

            tbody.append('<tr>\
                    <td data-value='+value+'>'+anonOutput.value_s+'</td>\
                    <td>' +  anonOutput.owned_outputs
                          + (anonOutput.owned_outputs == anonOutput.owned_mature
                            ? ''
                            : ' (<b>' + anonOutput.owned_mature + '</b>)') + '</td>\
                    <td>'+anonOutput.system_outputs + ' (' + anonOutput.system_mature + ')</td>\
                    <td>'+anonOutput.system_spends  +'</td>\
                    <td>'+anonOutput.least_depth    +'</td>\
                </tr>');
        }

        $('#chaindata .footable').trigger('footable_initialize');
    }
}
var blockExplorerPage =
{
    blockHeader: {},
    findBlock: function(searchID) {

        if(searchID === "" || searchID === null)
        {
            blockExplorerPage.updateLatestBlocks();
        }
        else
        {
            blockExplorerPage.foundBlock = bridge.findBlock(searchID);

            if(blockExplorerPage.foundBlock.error_msg !== '' )
            {
                $('#latest-blocks-table  > tbody').html('');
                $("#block-txs-table > tbody").html('');
                $("#block-txs-table").addClass("none");
                alert(blockExplorerPage.foundBlock.error_msg); //TODO: modal or something other than alert...
                return false;
            }

            var tbody = $('#latest-blocks-table  > tbody');
            tbody.html('');
            var txnTable = $('#block-txs-table  > tbody');
            txnTable.html('');
            $("#block-txs-table").addClass("none");

            tbody.append('<tr data-value='+blockExplorerPage.foundBlock.block_hash+'>\
                                     <td>'+blockExplorerPage.foundBlock.block_hash+'</td>\
                                     <td>'+blockExplorerPage.foundBlock.block_height+'</td>\
                                     <td>'+blockExplorerPage.foundBlock.block_timestamp+'</td>\
                                     <td>'+blockExplorerPage.foundBlock.block_transactions+'</td>\
                        </tr>');
            blockExplorerPage.prepareBlockTable();
        }
        // Keeping this just in case - Will remove if not used
    },
    updateLatestBlocks: function()
    {
        blockExplorerPage.latestBlocks = bridge.listLatestBlocks();
        var txnTable = $('#block-txs-table  > tbody');
        txnTable.html('');
        $("#block-txs-table").addClass("none");
        var tbody = $('#latest-blocks-table  > tbody');
        tbody.html('');
        for (value in blockExplorerPage.latestBlocks) {

            var latestBlock = blockExplorerPage.latestBlocks[value];

            tbody.append('<tr data-value='+latestBlock.block_hash+'>\
                         <td>' +  latestBlock.block_hash   + '</td>\
                         <td>' +  latestBlock.block_height + '</td>\
                         <td>' +  latestBlock.block_timestamp   + '</td>\
                         <td>' +  latestBlock.block_transactions+ '</td>\
                         </tr>');
        }
        blockExplorerPage.prepareBlockTable();
    },
    prepareBlockTable: function()
    {
        $("#latest-blocks-table  > tbody tr")
            .selection()
            .on('click', function()
                {
                    var blkHash = $(this).attr("data-value").trim();
                    blockExplorerPage.blkTxns = bridge.listTransactionsForBlock(blkHash);
                    var txnTable = $('#block-txs-table  > tbody');
                    txnTable.html('');
                    for (value in blockExplorerPage.blkTxns)
                    {
                        var blkTx = blockExplorerPage.blkTxns[value];

                        txnTable.append('<tr data-value='+blkTx.transaction_hash+'>\
                                    <td>' +  blkTx.transaction_hash  + '</td>\
                                    <td>' +  blkTx.transaction_value + '</td>\
                                    </tr>');
                    }

                    $("#block-txs-table").removeClass("none");
                    $("#block-txs-table > tbody tr")
                        .selection()

                        .on("dblclick", function(e) {

                            $('#blkexp-txn-modal').appendTo('body').modal('show');

                            selectedTxn = bridge.txnDetails(blkHash , $(this).attr("data-value").trim());

                            if(selectedTxn.error_msg == '')
                            {
                                $("#txn-hash").html(selectedTxn.transaction_hash);
                                $("#txn-size").html(selectedTxn.transaction_size);
                                $("#txn-rcvtime").html(selectedTxn.transaction_rcv_time);
                                $("#txn-minetime").html(selectedTxn.transaction_mined_time);
                                $("#txn-blkhash").html(selectedTxn.transaction_block_hash);
                                $("#txn-reward").html(selectedTxn.transaction_reward);
                                $("#txn-confirmations").html(selectedTxn.transaction_confirmations);
                                $("#txn-value").html(selectedTxn.transaction_value);
                                $("#error-msg").html(selectedTxn.error_msg);

                                if(selectedTxn.transaction_reward > 0)
                                {
                                    $("#lbl-reward-or-fee").html('<strong>Reward</strong>');
                                    $("#txn-reward").html(selectedTxn.transaction_reward);
                                }
                                else
                                {
                                    $("#lbl-reward-or-fee").html('<strong>Fee</strong>');
                                    $("#txn-reward").html(selectedTxn.transaction_reward * -1);
                                }
                            }

                            var txnInputs = $('#txn-detail-inputs > tbody');
                            txnInputs.html('');
                            for (value in selectedTxn.transaction_inputs) {

                              var txnInput = selectedTxn.transaction_inputs[value];

                              txnInputs.append('<tr data-value='+ txnInput.input_source_address+'>\
                                                   <td>' + txnInput.input_source_address  + '</td>\
                                                   <td>' + txnInput.input_value + '</td>\
                                                </tr>');
                            }

                            var txnOutputs = $('#txn-detail-outputs > tbody');
                            txnOutputs.html('');

                            for (value in selectedTxn.transaction_outputs) {

                              var txnOutput = selectedTxn.transaction_outputs[value];

                              txnOutputs.append('<tr data-value='+ txnOutput.output_source_address+'>\
                                                 <td>' +  txnOutput.output_source_address  + '</td>\
                                                 <td>' +  txnOutput.output_value + '</td>\
                                            </tr>');
                            }

                            $(this).click().off('click').selection();
                        }).find(".editable")
                })
            .on("dblclick", function(e)
            {
                $('#block-info-modal').appendTo('body').modal('show');

                selectedBlock = bridge.blockDetails($(this).attr("data-value").trim()) ;

                if(selectedBlock)
                {
                     $("#blk-hash").html(selectedBlock.block_hash);
                     $("#blk-numtx").html(selectedBlock.block_transactions);
                     $("#blk-height").html(selectedBlock.block_height);
                     $("#blk-type").html(selectedBlock.block_type);
                     $("#blk-reward").html(selectedBlock.block_reward);
                     $("#blk-timestamp").html(selectedBlock.block_timestamp);
                     $("#blk-merkleroot").html(selectedBlock.block_merkle_root);
                     $("#blk-prevblock").html(selectedBlock.block_prev_block);
                     $("#blk-nextblock").html(selectedBlock.block_next_block);
                     $("#blk-difficulty").html(selectedBlock.block_difficulty);
                     $("#blk-bits").html(selectedBlock.block_bits);
                     $("#blk-size").html(selectedBlock.block_size);
                     $("#blk-version").html(selectedBlock.block_version);
                     $("#blk-nonce").html(selectedBlock.block_nonce);
                }

                // $("#block-info").html();
                $(this).click()
                  .off('click')
                  .selection();
            }).find(".editable")
    }
}

var walletManagementPage = {
    init: function() {
        setupWizard('new-key-wizard');
        setupWizard('recover-key-wizard');
        setupWizard('open-key-wizard');
    },

    newMnemonic: function () {
        var result = bridge.getNewMnemonic( $("#new-account-passphrase").val(), $("#new-account-language").val() );
        var error  = result.error_msg;
        var mnemonic = result.mnemonic;

        if(error !== "")
            alert(error); //TODO: modal or something other than alert...
        else
            $("#new-key-mnemonic").val(mnemonic);

    },
    compareMnemonics: function () {
        var original = $("#new-key-mnemonic").val().trim();
        var typed    = $("#validate-key-mnemonic").val().trim();

        if (original == typed) {
            $("#validate-key-mnemonic").removeClass("red");
            $("#validate-key-mnemonic").val("");
            return true;
        }
        else
        {
            $("#validate-key-mnemonic").addClass("red");
            alert("The recovery phrase you provided does not match the recovery phrase that was generated earlier - please go back and check to make sure you have copied it down correctly.")

            return false;
        }
    },
    gotoPage: function(page) {
        $("#navitems a[href='#" + page + "']").trigger('click');
    },
    prepareAccountTable: function()
    {
        $("#extkey-account-table  > tbody tr")
            .selection()
            .on('click', function()
            {
                var otherTableRows = $('#extkey-table > tbody > tr');
                otherTableRows.removeClass("selected");
            })
    },
    updateAccountList: function() {
        walletManagementPage.accountList = bridge.extKeyAccList();

        var tbody = $('#extkey-account-table  > tbody');
        tbody.html('');
        for (value in walletManagementPage.accountList) {

            var acc = walletManagementPage.accountList[value];

            tbody.append('<tr data-value='+acc.id+' active-flag=' + acc.active + '>\
                         <td>' +  acc.id   + '</td>\
                         <td>' +  acc.label + '</td>\
                         <td>' +  acc.created_at + '</td>\
                         <td class="center-margin"><i style="font-size: 1.2em; margin: auto;" ' + ((acc.active == 'true') ? 'class="fa fa-circle green-circle"' : 'class="fa fa-circle red-circle"') + ' ></i></td>\
                         <td style="font-size: 1em; margin-bottom: 6px;">' +  ((acc.default_account !== undefined ? "<i class='center fa fa-check'></i>" : "")) + '</td>\
                         </tr>');
        }
        walletManagementPage.prepareAccountTable();
    },
    prepareKeyTable: function()
    {
        $("#extkey-table  > tbody tr")
            .selection()
            .on('click', function()
            {
                var otherTableRows = $('#extkey-account-table > tbody > tr');
                otherTableRows.removeClass("selected");
            })
    },
    updateKeyList: function() {
        walletManagementPage.keyList = bridge.extKeyList();

        var tbody = $('#extkey-table  > tbody');
        tbody.html('');
        for (value in walletManagementPage.keyList) {

            var key = walletManagementPage.keyList[value];
            tbody.append('<tr data-value='+key.id+' active-flag=' + key.active + '>\
                         <td>' +  key.id   + '</td>\
                         <td>' +  key.label + '</td>\
                         <td>' +  key.path + '</td>\
                         <td><i style="font-size: 1.2em; margin: auto;" ' + ((key.active == 'true') ? 'class="fa fa-circle green-circle"' : 'class="fa fa-circle red-circle"') + ' ></i></td>\
                         <td style="font-size: 1em; margin-bottom: 6px;">' +  ((key.current_master !== undefined ? "<i class='center fa fa-check'></i>" : "")) + '</td>\
                         </tr>');
        }
        walletManagementPage.prepareKeyTable();
    },
    newKey: function()
    {
        result = bridge.importFromMnemonic($('#new-key-mnemonic').val().trim(),
                                           $('#new-account-passphrase').val().trim(),
                                           $('#new-account-label').val().trim(),
                                           $('#new-account-bip44').prop("checked"));

        if(result.error_msg !== '') {
            alert(result.error_msg); //TODO: modal or something other than alert...
            return false;
        }
    },
    recoverKey: function()
    {
        result = bridge.importFromMnemonic($("#recover-key-mnemonic").val().trim(),
                                           $("#recover-passphrase").val().trim(),
                                           $("#recover-account-label").val().trim(),
                                           $("#recover-bip44").prop("checked"),
                                           1443657600);

        if(result.error_msg !== '') {
            alert(result.error_msg); //TODO: modal or something other than alert...
            return false;
        }
        else
            return true;
    },
    setMaster: function()
    {
        var keySelector = $("#extkey-table tr.selected");
        if( !keySelector.length )
        {
            alert("Please select a key to set it as master."); //TODO: modal or something other than alert...
            return false;
        }

        selected = $("#extkey-table tr.selected").attr("data-value").trim();
        if(selected !== undefined && selected !== "") {
            result = bridge.extKeySetMaster(selected);
            if(result.error_msg !== '') {
                alert(result.error_msg); //TODO: modal or something other than alert...
                return false;
            }
            else
            {
                walletManagementPage.updateKeyList();
            }
        }
        else
        {
            alert("Select a key from the table to set a Master."); //TODO: modal or something other than alert...
            return false;
        }
    },
    setDefault: function()
    {
        var accSelector = $("#extkey-account-table tr.selected");

        if( !accSelector.length )
        {
            alert("Please select an account to set it as default."); //TODO: modal or something other than alert...
            return false;
        }

        selected = $("#extkey-account-table tr.selected").attr("data-value").trim();
        if(selected !== undefined && selected !== "") {
            result = bridge.extKeySetDefault(selected);
            if(result.error_msg !== '') {
                alert(result.error_msg); //TODO: modal or something other than alert...
                return false;
            }
            else
            {
                walletManagementPage.updateAccountList();
            }
        }
        else
        {
            alert("Select an account from the table to set a default.");
            return false;
        }
    },
    changeActiveFlag: function()
    {
        var forAcc = false;

        //Check whats selected - if anything.
        var accSelector = $("#extkey-account-table tr.selected");
        var keySelector = $("#extkey-table tr.selected");
        if( !accSelector.length && !keySelector.length )
        {
            alert("Please select an account or key to change the active status."); //TODO: modal or something other than alert...
            return false;
        }

        if( accSelector.length) {
            selected = accSelector.attr("data-value").trim();
            active   = accSelector.attr("active-flag").trim();
            forAcc   = true;
        } else {
            selected = keySelector.attr("data-value").trim();
            active   = keySelector.attr("active-flag").trim();
        }

        if(selected !== undefined && selected !== "") {
            result = bridge.extKeySetActive(selected, active);
            if(result.error_msg !== '') {
                alert(result.error_msg); //TODO: modal or something other than alert...
                return false;
            }
            else
            {
                if(forAcc)
                {
                    walletManagementPage.updateAccountList();
                }
                else
                {
                    walletManagementPage.updateKeyList();
                }
            }
        }
        else
        {
            alert("Please select an account or key to change the active status."); //TODO: modal or something other than alert...
            return false;
        }
    }
}

function setupWizard(section) {

    var steps = $("#" + section + " > div");

    // I just did this to make using 's and "s easier in the below prepend and append.
    backbtnjs = '$("#key-options").show(); $("#wizards").hide();';
    fwdbtnjs  = 'gotoWizard("new-key-wizard", 1);';
    //$("#" + section).prepend("<div id='backWiz'  class='btn btn-default btn-cons wizardback' onclick='" + backbtnjs + "' >Back</div>")
    //$("#" + section).prepend("<div id='fwdWiz'   class='btn btn-default btn-cons wizardfwd'  onclick='" + fwdbtnjs  + "' >Next Step</div>")
    $("#" + section).prepend("<div id='backWiz' style='display:none;' class='btn btn-default btn-cons wizardback' onclick='" + backbtnjs + "' >Back</div>")
    $("#" + section).prepend("<div id='fwdWiz'  style='display:none;' class='btn btn-default btn-cons wizardfwd'  onclick='" + fwdbtnjs  + "' >Next Step</div>")
    steps.each(function (i) {
            $(this).addClass("step" + i)
            $(this).hide();
            $("#backWiz").hide();
        }
    );
}

function gotoWizard(section, step, runStepJS) {
    // Hide all wizards
    var sections = $("#wizards > div");

    // Run validation on the wizard step - any error messages can be set there as well
    // TODO:  enhance these wizard functions to cater for validation fields etc.
    validateJS = $("#" + section + " .step" + (step - 1) ).attr("validateJS");

    // We check runStepJS because we must only validate when moving forward in the wizard
    if(runStepJS && validateJS !== undefined)
    {
        var valid = eval(validateJS);
        if(!valid) {return false;}
    }

    sections.each(function (i) {
        $(this).hide();
    })

    var steps = $("#" + section + " > div[class^=step]");
    var gotoStep = step;
    if (gotoStep == null) { gotoStep = 0;
    }

    if(gotoStep == 0) {
        $("#" + section + " #backWiz").attr( 'onclick', '$(".wizardback").hide(); $("#wizards").show();' )
        $("#" + section + " #fwdWiz").attr( 'onclick', '$(".wizardback").hide(); gotoWizard("' + section + '", 1, true);' )
        // $("#" + section + " #fwdWiz").attr( 'onclick', '$(".wizardback").show(); gotoWizard("' + section + '", 1, true);' )
        $("#backWiz").hide();
    }
    else
    {
        $("#" + section + " #backWiz").attr( 'onclick', 'gotoWizard("' + section + '", ' + (gotoStep - 1) + ' , false);' )
        $("#" + section + " #fwdWiz").attr( 'onclick',  'gotoWizard("' + section + '", ' + (gotoStep + 1) + ' , true);' )
    }

    // If we're at the end of the wizard then change the forward button to do whatever
    endWiz = $("#" + section + " .step" + (step) ).attr("endWiz");
    if(endWiz !== undefined && endWiz !== "")
      $("#" + section + " #fwdWiz").attr( 'onclick',  endWiz );

    // Hide all wizard steps - if we want cross wizards/steps etc.
    steps.each(function (i) {
        $(this).hide();
    });

    //Show the correct section and the step.
    $("#" + section).show();
    stepJS = $("#" + section + " .step" + gotoStep ).attr("stepJS");

    // Run the JS we want for this step we're about to start -
    if(runStepJS && stepJS !== undefined)
    {
        eval(stepJS);
    }
    $("#" + section + " .step" + gotoStep ).fadeIn(0);
    //$("#" + section + " .step" + gotoStep ).fadeIn(500);
}

function dumpStrings() {
    var strings = '';

    function buildStr(str) {
        return 'QT_TRANSLATE_NOOP("ShadowBridge", "' + str + '"),\n';
    }

    $(".translate").each(function(el) {
        var str = buildStr($(this).text().trim());
        if (strings.indexOf(str) == -1)
            strings += str;
    });

    $("[data-title]").each(function(el) {
        var str = buildStr($(this).attr('data-title').trim());
        if (strings.indexOf(str) == -1)
            strings += str;
    })
    console.log(strings);
}

function translateStrings() {
    $(".translate").each(function(el) {
        var str = $(this).text();

        $(this).text(str.replace(str, bridge.translateHtmlString(str.trim())));
    });

    $("[data-title]").each(function(el) {
        var str = $(this).attr('data-title');

        $(this).attr('data-title', str.replace(str, bridge.translateHtmlString(str.trim())));
    });
}
