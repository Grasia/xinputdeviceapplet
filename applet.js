/**
* XinputApplet 
* Switch to activate/deactivate pointer devices, using the xinput command.
* Juan Pavón (UCM, 13/04/2017)
*/

/*
* Utiliza el intérprete Javascript de Cinnamon (cjs).
* La documentación está muy dispersa y no es muy completa (http://developer.linuxmint.com/reference/git/index.html)
* Sobre Cinnamon https://github.com/linuxmint/Cinnamon/wiki
*
* Lo mejor es empezar viendo la programación JavaScript en Gnome que es bastante similar:
* https://developer.gnome.org/gnome-devel-demos/stable/hellognome.js.html.en 
* https://wiki.gnome.org/Home  y especialmente https://wiki.gnome.org/Projects/Gjs
*
* Para ejecutar comandos del sistema operativo, normalmente con spawn_command_line_sync.
* Ejemplos en https://gist.github.com/buzztaiki/1487781/74ea93d3a30f20c7f094327db9cb263a6286f6d6
*
*/

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Applet = imports.ui.applet; 
const PopupMenu = imports.ui.popupMenu;  

////////////////////////////////////////////////////////////////////////////////////

const APPLET_ICON = global.userdatadir + "/applets/touchpad@jpavon/icon.png";

////////////////////////////////////////////////////////////////////////////////////

/**
* Class XinputDevice
*
* Tiene los atributos del dispositivo (nombre e id de device que devuelve el comando xinput)
* Gestiona el estado (enable, disable, isEnabled)
*
*/
function XinputDevice(nombre, id) {
    this._init(nombre, id);
}

XinputDevice.prototype = {
    _init: function(nombre, id) {   // Se conseguirán estos valores con xinput
        this.nombre = nombre;   // El nombre del dispositivo
        this.id = id;           // El número que se le asigna
    },
    
    
    enable: function() {
        GLib.spawn_command_line_sync('xinput enable ' + this.id);
    },

    disable: function() {
        GLib.spawn_command_line_sync('xinput disable ' + this.id);
    },

    isEnabled: function() {
        let [res, out, err, status] = GLib.spawn_command_line_sync('xinput list-props ' + this.id);
        if (out) {
            let lineas = out.toString().split("\n");

            for (let linea = 0; linea < lineas.length; linea++) {
                if (lineas[linea].indexOf("Device Enabled")!=-1) {
                    let enabled=parseInt((lineas[linea].substring(lineas[linea].lastIndexOf(":")+1)).trim());
                    return enabled; // 0 o 1
                }
            }
        }
        return false;
    },
};


/**
* Class XinputApplet
*
* El applet. De momento para el Touchpad y el Stick, que son los que molestan a veces.
*/
function XinputApplet(metadata, orientation, panel_height, applet_id) { 
	this._init(metadata, orientation, panel_height, applet_id); 
}

XinputApplet.prototype = { 
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
       Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

	   try {
		// Define el icono a usar por el applet en el panel
		this.set_applet_icon_path(APPLET_ICON);

		// Indica el texto de ayuda que aparece al pasar por el icono del applet
		this.set_applet_tooltip(_("Switch pointer device on/off"));	

		// Crea el menú:
		this.menuManager = new PopupMenu.PopupMenuManager(this); //Crea el gestor del popup-menu
		this.menu = new Applet.AppletPopupMenu(this, orientation); //crea un menu
		this.menuManager.addMenu(this.menu); // Y lo añade al gestor del popup-menu

/*** TouchPad ***/
        // Identifica el touchpad y su estado para crear el objeto que lo referencia y el botón de switch
        let [res, out, err, status] = GLib.spawn_command_line_sync('xinput'); 

        if (out) {
            let salida = out.toString().split("\n");

            for (let linea = 0; linea < salida.length; linea++) {
              if (salida[linea].indexOf("TouchPad")!=-1) {
                let nombre=(salida[linea].substring(5,salida[linea].indexOf("id="))).trim();
                let id=parseInt(salida[linea].substring(salida[linea].indexOf("id=")+3,salida[linea].indexOf("id=")+5));
                
                // Crea el objeto con la información del touchpad:
                this.tp = new XinputDevice(nombre, id);
              }
            }
        }

		// El switch
        // Hay que mirar el código de PopupSwitchMenuItem en el fichero popupMenu.js en /usr/share/cinnamon/js/ui/
           // porque documentación del cinnamon, cero patatero.
        let touchpadSwitch = new PopupMenu.PopupSwitchMenuItem(this.tp.nombre, this.tp.isEnabled());
            
        var self=this;  // Para usar la referencia al objeto this.touchpad cuando se haga el callback a continuación
                        // Ver https://hangar.runway7.net/javascript/guide
        // El PopupSwitchMenuItem puede recibir la señal 'toggled', y con connect se indica la función de callback
        touchpadSwitch.connect('toggled', function(item) {
            if (touchpadSwitch.state) { 
                self.tp.enable();
            }
            else {
                self.tp.disable();
            }
        });
        // Finalmente se añade el botón de switch al menú del applet
		this.menu.addMenuItem(touchpadSwitch);  
           
/*** Stick ***/
        // Identifica el stick y su estado para crear el objeto que lo referencia y el botón de switch
      //  let [res, out, err, status] = GLib.spawn_command_line_sync('xinput'); 

        if (out) {
            let salida = out.toString().split("\n");

            for (let line = 0; line < salida.length; line++) {
              if (salida[line].indexOf("Stick")!=-1) {
                let nombre=(salida[line].substring(5,salida[line].indexOf("id="))).trim();
                let id=parseInt(salida[line].substring(salida[line].indexOf("id=")+3,salida[line].indexOf("id=")+5));
                
                // Crea el objeto con la información del stick:
                this.stick = new XinputDevice(nombre, id);
              }
            }
        }

		// El switch
        let stickSwitch = new PopupMenu.PopupSwitchMenuItem(this.stick.nombre, this.stick.isEnabled());
            
        var stick=this.stick;  // Usará la referencia al objeto stick cuando se haga el callback a continuación
        // El PopupSwitchMenuItem puede recibir la señal 'toggled', y con connect se indica la función de callback
        stickSwitch.connect('toggled', function(item) {
            if (stickSwitch.state) { 
                stick.enable();
            }
            else {
                stick.disable();
            }
        });
        // Finalmente se añade el botón de switch al menú del applet
		this.menu.addMenuItem(stickSwitch);  

	   }
	   catch (e) {
  		global.logError(e); // Escribe el error en el registro de error global
			// Se puede ver el error con Looking Glass: 
			// Pulse Alt F2, escriba "lg" y haga clic en la pestaña de "errores"
	   }
    },

    // Señal emitida por el applet, para llamar al popup-menu
    on_applet_clicked: function(event) { 
      	this.menu.toggle();
    }
};


/**
* Función principal para crear el applet
*/
function main(metadata, orientation, panel_height, instance_id) {
    let applet = new XinputApplet(metadata, orientation, panel_height, instance_id);
    return applet;      
}


