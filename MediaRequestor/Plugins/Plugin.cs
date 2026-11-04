using MediaBrowser.Common;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Net;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Controller.Security;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Drawing;
using MediaBrowser.Model.IO;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Tasks;
using MediaRequestor.Features;
using MediaRequestor.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Runtime.InteropServices;

namespace System.Diagnostics.CodeAnalysis
{
    [AttributeUsage( AttributeTargets.Parameter, Inherited = false )]
    internal sealed class MaybeNullWhenAttribute : Attribute
    {
        public MaybeNullWhenAttribute( bool returnValue ) => ReturnValue = returnValue;

        public bool ReturnValue { get; }
    }
}

namespace MediaRequestor
{
    public partial class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages, IHasThumbImage
    {
        public Plugin(
            IApplicationPaths applicationPaths,
            IXmlSerializer xmlSerializer
            )
            : base( applicationPaths, xmlSerializer )
        {
            Instance = this;
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            return new PluginPageInfo[]
            {
                new() {
                    Name = "media-requestor-style.css",
                    EmbeddedResourcePath = GetType().Namespace + ".Resources.style.css"
                },
                new() {
                    Name = "MediaRequestor",
                    EmbeddedResourcePath = GetType().Namespace + ".Pages.MediaRequestor.html",
                    EnableInMainMenu = true
                },
                new() {
                    Name = "MediaRequestor.js",
                    EmbeddedResourcePath = GetType().Namespace + ".Pages.MediaRequestor.js"
                },
            };
        }

        public override Guid Id => new( "5864971F-6CCC-4105-8756-7F00D44520E0" );

        public static Plugin? Instance { get; private set; } = null;
        public static string StaticName = "Media Requestor";

        private string? _serverId { get; set; } = null;

        private static readonly object _padlock = new();

        public string? ServerId
        {
            get => _serverId;
            set
            {
                if( _serverId != null )
                    return;
                _serverId = value;
            }
        } // set when a embyInterfaces is constructed

        public override string Name => StaticName;

        public override string Description => "Edit them variables and see the results";

        public Stream GetThumbImage()
        {
            var type = GetType();
            return type.Assembly.GetManifestResourceStream( type.Namespace + ".Resources.thumb.png" );
        }

        public ImageFormat ThumbImageFormat => ImageFormat.Png;
    }
}
