using MediaBrowser.Model.Plugins;

namespace MediaRequestor.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public PluginConfiguration() { }

        public string BuildDate { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
    }
}

