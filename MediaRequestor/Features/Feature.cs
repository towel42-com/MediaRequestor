using Emby.Features;
using System.Collections.Generic;

namespace MediaRequestor.Features
{
    public class Feature : IFeatureFactory
    {
        public const string StaticId = "MediaRequestor";

        public List<FeatureInfo> GetFeatureInfos( string language )
        {
            return
            [
                new FeatureInfo
                {
                    Id = StaticId,
                    Name = Plugin.StaticName,
                    FeatureType = FeatureType.User
                }
            ];
        }
    }
}
